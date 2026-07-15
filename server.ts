import express from "express";
import "dotenv/config";
import path from "path";
import fs from "fs";
import { scrapeHome, scrapeAnime, scrapeSearch, scrapeEpisode, updateEpisodesRepository, fetchAniListMovies, verifyVideoServers, AnimeApiAggregator } from "./src/utils/scraper";
import { GENRES_LIST, Manga } from "./src/types";
import { getAnimePlaceholder } from "./src/utils/imageUtils";
import { MOCK_MANGAS } from "./src/utils/mangaDb";
import cron from "node-cron";
import NodeCache from "node-cache";

// Initialize cache: check every 2 minutes for expired items
const apiCache = new NodeCache({ stdTTL: 1800, checkperiod: 120 });

// In-memory simulation of user storage (active session helper)
const USERS_DB: Record<string, { username: string; email: string; favorites: string[] }> = {};

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // --- CUSTOM ADMIN DATABASE IMPLEMENTATION ---
  const customDbPath = path.join(process.cwd(), "src/utils/customAnimes.json");
  const customMangasDbPath = path.join(process.cwd(), "src/utils/customMangas.json");

  function readCustomDb(): any[] {
    try {
      if (fs.existsSync(customDbPath)) {
        const raw = fs.readFileSync(customDbPath, "utf8");
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error("Error reading customDb:", e);
    }
    return [];
  }

  function writeCustomDb(data: any[]) {
    try {
      const parentDir = path.dirname(customDbPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(customDbPath, JSON.stringify(data, null, 2), "utf8");
    } catch (e) {
      console.error("Error writing customDb:", e);
    }
  }

  function readCustomMangasDb(): any[] {
    try {
      if (fs.existsSync(customMangasDbPath)) {
        const raw = fs.readFileSync(customMangasDbPath, "utf8");
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error("Error reading customMangasDb:", e);
    }
    return [];
  }

  function writeCustomMangasDb(data: any[]) {
    try {
      const parentDir = path.dirname(customMangasDbPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(customMangasDbPath, JSON.stringify(data, null, 2), "utf8");
    } catch (e) {
      console.error("Error writing customMangasDb:", e);
    }
  }

  let GLOBAL_CUSTOM_ANIMES = readCustomDb();
  let GLOBAL_CUSTOM_MANGAS = readCustomMangasDb();

  // Initialize background Cron Job (8:00 AM Eastern Time every day)
  cron.schedule("0 8 * * *", async () => {
    console.log("CRON JOB TRIGGERED: Starting automatic data refresh at 8:00 AM Eastern Time...");
    await updateEpisodesRepository();
    apiCache.flushAll(); // Clear cache on manual refresh
  }, {
    timezone: "America/New_York"
  });
  
  // Pre-fetch the latest episodes immediately when server starts
  updateEpisodesRepository();

  // Body parsers
  app.use(express.json());

  // --- API ROUTES ---

  // 1. Get Home Screen lists (Seasonal, Popular, Episodes)
  app.get("/api/home", async (req, res) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const cacheKey = `home_data_p${page}`;
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) return res.json(cachedData);

    try {
      const data = await scrapeHome(page);
      
      // Inject custom animes and their episodes
      if (data && data.success) {
        GLOBAL_CUSTOM_ANIMES = readCustomDb();
        if (GLOBAL_CUSTOM_ANIMES.length > 0) {
          // Put custom animes in seasonal list
          data.seasonal = [...GLOBAL_CUSTOM_ANIMES, ...(data.seasonal || [])];
          
          // Generate recent episodes for home section
          const customEps: any[] = [];
          GLOBAL_CUSTOM_ANIMES.forEach(anime => {
            const count = anime.episodesCount || 0;
            if (count > 0) {
              const lastEpNum = count;
              customEps.push({
                id: `${anime.id}-${lastEpNum}`,
                title: `${anime.title} - Episodio ${lastEpNum}`,
                number: lastEpNum,
                animeId: anime.id,
                animeTitle: anime.title,
                coverUrl: anime.coverUrl,
                videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                videoServers: [
                  { name: "MegaServer 1", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" }
                ]
              });
            }
          });
          data.episodes = [...customEps, ...(data.episodes || [])];
        }
      }

      apiCache.set(cacheKey, data, 1800); // 30 mins
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to load home page" });
    }
  });

  // 2. Search for animes
  app.get("/api/search", async (req, res) => {
    const q = req.query.q as string;
    const page = parseInt(req.query.page as string, 10) || 1;
    
    const cacheKey = `search_${(q || 'airing').toLowerCase()}_p${page}`;
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) return res.json(cachedData);

    try {
      let data;
      if (q) {
        data = await scrapeSearch(q, page);
        
        // Match in custom DB
        GLOBAL_CUSTOM_ANIMES = readCustomDb();
        const lowercaseQ = q.toLowerCase();
        const matchedCustom = GLOBAL_CUSTOM_ANIMES.filter(a => 
          a.title.toLowerCase().includes(lowercaseQ) || 
          a.synopsis.toLowerCase().includes(lowercaseQ) ||
          a.genres.some(g => g.toLowerCase().includes(lowercaseQ))
        );
        data = [...matchedCustom, ...data];
      } else {
        // "Todos" filter - fetch releasing (airing) for pages 1-4, then popular completed shows for page 5+
        if (page <= 4) {
          data = await AnimeApiAggregator.getAiring(page);
          GLOBAL_CUSTOM_ANIMES = readCustomDb();
          data = [...GLOBAL_CUSTOM_ANIMES, ...data];
        } else {
          data = await AnimeApiAggregator.getFinished(page - 4);
        }
      }
      apiCache.set(cacheKey, data, 3600); // 1 hour
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Search failed" });
    }
  });

  // 2b. Search suggestions (autocomplete)
  app.get("/api/suggestions", async (req, res) => {
    const q = req.query.q as string;
    if (!q || q.length < 2) return res.json([]);

    const cacheKey = `suggestions_${q.toLowerCase()}`;
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) return res.json(cachedData);

    try {
      // Use a faster search for suggestions, maybe limited to just first few results
      const data = await scrapeSearch(q);
      const suggestions = data.slice(0, 6).map(anime => ({
        id: anime.id,
        title: anime.title,
        coverUrl: anime.coverUrl,
        type: anime.type,
        year: anime.year
      }));
      
      apiCache.set(cacheKey, suggestions, 3600);
      res.json(suggestions);
    } catch (error) {
      res.json([]);
    }
  });

  // 3. Get single anime details and episode list
  app.get("/api/anime/:id", async (req, res) => {
    const { id } = req.params;
    const cacheKey = `anime_${id}`;
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) return res.json(cachedData);

    try {
      // Check custom DB first
      GLOBAL_CUSTOM_ANIMES = readCustomDb();
      const custom = GLOBAL_CUSTOM_ANIMES.find(a => a.id === id);
      if (custom) {
        // If custom anime episodes are not populated, generate them dynamically
        const episodes = [];
        for (let i = 1; i <= custom.episodesCount; i++) {
          episodes.push({
            id: `${custom.id}-${i}`,
            title: `${custom.title} - Episodio ${i}`,
            number: i,
            animeId: custom.id,
            animeTitle: custom.title,
            coverUrl: custom.coverUrl,
            videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            videoServers: [
              { name: "MegaServer 1", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" }
            ]
          });
        }
        const fullAnime = { ...custom, episodes };
        apiCache.set(cacheKey, fullAnime, 7200);
        return res.json(fullAnime);
      }

      const data = await scrapeAnime(id);
      apiCache.set(cacheKey, data, 7200); // 2 hours
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch anime details" });
    }
  });

  // 4. Get episode video stream servers
  app.get("/api/episode/:id", async (req, res) => {
    const { id } = req.params;
    const cacheKey = `episode_${id}`;
    
    const cached = apiCache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
      // Check custom DB first
      GLOBAL_CUSTOM_ANIMES = readCustomDb();
      let foundCustomEp: any = null;
      for (const anime of GLOBAL_CUSTOM_ANIMES) {
        // If episode ID matches custom anime ID pattern
        if (id.startsWith(anime.id + "-")) {
          const parts = id.split("-");
          const epNum = parseInt(parts[parts.length - 1], 10);
          foundCustomEp = {
            id,
            title: `${anime.title} - Episodio ${epNum}`,
            number: epNum,
            animeId: anime.id,
            animeTitle: anime.title,
            coverUrl: anime.coverUrl,
            videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            videoServers: [
              { name: "MegaServer 1", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" }
            ]
          };
          break;
        }
      }

      if (foundCustomEp) {
        apiCache.set(cacheKey, foundCustomEp, 86400);
        return res.json(foundCustomEp);
      }

      const freshData = await scrapeEpisode(id);
      const hasRealServers = freshData && freshData.videoServers && freshData.videoServers.length > 2;
      
      if (hasRealServers) {
        apiCache.set(cacheKey, freshData, 86400); // cache for 24 hours
      } else {
        apiCache.set(cacheKey, freshData, 5); // cache for only 5 seconds
      }
      res.json(freshData);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch episode players" });
    }
  });

  // 5. Get available categories / genres
  app.get("/api/genres", (req, res) => {
    res.json(GENRES_LIST);
  });

  // 5c. Get mangas (from MangaDex)
  app.get("/api/mangas", async (req, res) => {
    const pageParam = req.query.page;
    const page = typeof pageParam === 'string' ? parseInt(pageParam, 10) || 1 : 1;
    const genreParam = req.query.genre;
    const limit = 20;
    const offset = (page - 1) * limit;

    const MANGADEX_TAGS: Record<string, string> = {
      "Acción": "391b0423-db21-4890-85fb-b2f342738a03",
      "Aventura": "87cc8738-d6a4-4f0e-b7e1-88f58c707538",
      "Comedia": "4d32b851-d85c-436c-aba0-fa626998c38c",
      "Drama": "b9af3a06-3848-4251-98e3-da6530188041",
      "Fantasía": "cdc58593-37dd-4156-b010-96025064e4f5",
      "Romance": "423e273a-3b92-49a2-ae62-8418c633a268",
      "Ciencia Ficción": "256c895d-d6f1-414d-917a-5557ce0dadaf",
      "Shounen": "27c3e57a-48f5-4161-a8a8-a40b07202383",
      "Seinen": "3b60b75c-a2d7-4860-8f69-df924b068b32",
      "Recuentos de la vida": "e5301a23-ebd9-49dd-a0cb-2af9d60d370c",
      "Terror": "cd86a313-f642-4e88-8090-d1667351ded8",
      "Sobrenatural": "eabc5bde-9397-43f2-a301-a83b49051bd8",
      "Misterio": "ee968100-41d1-4ad6-83f3-752bd234651d",
      "Psicológico": "3b60b75c-a2d7-4860-8f69-df924b068b32",
      "Escolar": "caaa44aa-d692-4c30-a4f2-9590f69f4c6e",
      "Deportes": "6995039a-6c30-410a-86c3-98ce44e54881",
      "Mecha": "508d148a-ad40-426e-9533-5c305747cc2a",
      "Isekai": "ace04321-c630-455b-b459-d3027e9dd17f"
    };

    const cacheKey = `mangas_p${page}_g${genreParam || "none"}`;
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) return res.json(cachedData);

    try {
      let url = `https://api.mangadex.org/manga?limit=${limit}&offset=${offset}&includes[]=cover_art&order[rating]=desc&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica`;
      
      if (typeof genreParam === 'string' && MANGADEX_TAGS[genreParam]) {
        url += `&includedTags[]=${MANGADEX_TAGS[genreParam]}`;
      }

      const response = await fetch(url, {
        headers: {
          "User-Agent": "MegaAnime-App/1.2.0 (contact: BaezCabrera.J.R@gmail.com)",
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        return res.json({ mangas: [], totalPages: 1 });
      }

      const data = await response.json();
      if (!data || !Array.isArray(data.data)) throw new Error("Invalid data format");

      const mangaIds = data.data.map((m: any) => m.id);
      let statistics: Record<string, any> = {};

      if (mangaIds.length > 0) {
        try {
          const statsUrl = `https://api.mangadex.org/statistics/manga?${mangaIds.map(id => `manga[]=${id}`).join('&')}`;
          const statsRes = await fetch(statsUrl, {
            headers: {
              "User-Agent": "MegaAnime-App/1.2.0 (contact: BaezCabrera.J.R@gmail.com)",
              "Accept": "application/json"
            }
          });
          if (statsRes.ok) {
            const statsData = await statsRes.json();
            statistics = statsData.statistics || {};
          }
        } catch (e) {}
      }
      
      const mangas: Manga[] = data.data.map((m: any) => {
        // Find cover_art relationship and attributes
        const coverArt = m.relationships.find((rel: any) => rel.type === "cover_art");
        let fileName = coverArt?.attributes?.fileName;
        
        // If attributes are missing (e.g. not expanded correctly in response)
        // sometimes we have to look in the top-level 'included' array
        if (!fileName && data.included) {
          const includedCover = data.included.find((inc: any) => inc.type === "cover_art" && inc.id === coverArt?.id);
          fileName = includedCover?.attributes?.fileName;
        }

        const coverUrl = fileName 
          ? `https://uploads.mangadex.org/covers/${m.id}/${fileName}.256.jpg` 
          : "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400"; // Fallback
        const title = m.attributes.title.es || m.attributes.title["es-la"] || m.attributes.title.en || (m.attributes.title && Object.values(m.attributes.title)[0]);
        const lastChapterStr = m.attributes.lastChapter;
        const lastChapter = lastChapterStr ? parseFloat(lastChapterStr) : 0;
        const rating = statistics[m.id]?.rating?.average || 0;
        
        return {
          id: m.id,
          title: title || "Sin título",
          synopsis: m.attributes.description?.es || m.attributes.description?.en || "Sinopsis no disponible.",
          coverUrl: coverUrl,
          genres: m.attributes.tags.filter((t: any) => t.type === "tag").map((t: any) => t.attributes.name.en),
          status: m.attributes.status === "ongoing" ? "En emisión" : "Finalizado",
          year: m.attributes.year || 0,
          chaptersCount: isNaN(lastChapter) || lastChapter === 0 ? 0 : Math.floor(lastChapter),
          rating: Math.round(rating * 10) / 10
        };
      });

      // Sort: "En emisión" first, then "Finalizado"
      mangas.sort((a, b) => {
        if (a.status === "En emisión" && b.status !== "En emisión") return -1;
        if (a.status !== "En emisión" && b.status === "En emisión") return 1;
        return 0;
      });
      
      const result = { mangas, totalPages: Math.ceil(data.total / limit) };
      apiCache.set(cacheKey, result, 3600); // 1 hour
      res.json(result);
    } catch (error) {
      res.json({ mangas: [], totalPages: 1 });
    }
  });

  // 5d. Get manga chapters
  app.get("/api/manga/:id/chapters", async (req, res) => {
    const { id } = req.params;
    
    // Validate UUID format roughly or at least check for "undefined"/"null"
    if (!id || id === 'undefined' || id === 'null' || id.length < 10) {
      console.warn("Invalid Manga ID requested:", id);
      return res.json([]);
    }

    const cacheKey = `manga_chapters_${id}`;
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) return res.json(cachedData);

    try {
      const url = `https://api.mangadex.org/manga/${id}/feed?translatedLanguage[]=es&translatedLanguage[]=es-la&translatedLanguage[]=en&order[chapter]=asc&limit=500&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&contentRating[]=pornographic`;
      
      const response = await fetch(url, {
        headers: {
          "User-Agent": "MegaAnime-App/1.2.0 (contact: BaezCabrera.J.R@gmail.com)",
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        return res.json([]);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        return res.json([]);
      }

      const data = await response.json();
      if (!data || !Array.isArray(data.data)) return res.json([]);
      
      // Filter out chapters that are just placeholders or external
      const chapters = data.data
        .filter((c: any) => c.attributes.pages > 0 || c.attributes.externalUrl)
        .map((c: any) => ({
          id: c.id,
          title: `Capítulo ${c.attributes.chapter || '?'} ${c.attributes.title ? `- ${c.attributes.title}` : ''}`,
          chapter: c.attributes.chapter
        }));

      // Sort chapters numerically by chapter number
      chapters.sort((a: any, b: any) => {
        const valA = parseFloat(a.chapter) || 0;
        const valB = parseFloat(b.chapter) || 0;
        return valA - valB;
      });
      
      apiCache.set(cacheKey, chapters, 3600); // 1 hour
      res.json(chapters);
    } catch (error) {
      res.json([]);
    }
  });

  // 5d-2. Get single manga details from MangaDex
  app.get("/api/manga-detail/:id", async (req, res) => {
    const { id } = req.params;
    if (!id || id === 'undefined' || id === 'null' || id.length < 10) {
      return res.status(400).json({ error: "Invalid Manga ID" });
    }

    const cacheKey = `manga_detail_${id}`;
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) return res.json(cachedData);

    try {
      const url = `https://api.mangadex.org/manga/${id}?includes[]=cover_art`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "MegaAnime-App/1.2.0 (contact: BaezCabrera.J.R@gmail.com)",
          "Accept": "application/json"
        }
      });
      if (!response.ok) {
        return res.status(404).json({ error: "Manga not found" });
      }

      const data = await response.json();
      const m = data.data;
      if (!m) {
        return res.status(404).json({ error: "Manga data empty" });
      }

      // Fetch stats
      let statistics: Record<string, any> = {};
      try {
        const statsRes = await fetch(`https://api.mangadex.org/statistics/manga/${id}`, {
          headers: {
            "User-Agent": "MegaAnime-App/1.2.0 (contact: BaezCabrera.J.R@gmail.com)",
            "Accept": "application/json"
          }
        });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          statistics = statsData.statistics || {};
        }
      } catch (e) {}

      const coverArt = m.relationships?.find((rel: any) => rel.type === "cover_art");
      let fileName = coverArt?.attributes?.fileName;
      if (!fileName && data.included) {
        const includedCover = data.included.find((inc: any) => inc.type === "cover_art" && inc.id === coverArt?.id);
        fileName = includedCover?.attributes?.fileName;
      }
      if (!fileName && m.relationships) {
        const includedCover = m.relationships.find((inc: any) => inc.type === "cover_art");
        fileName = includedCover?.attributes?.fileName;
      }

      const coverUrl = fileName 
        ? `https://uploads.mangadex.org/covers/${m.id}/${fileName}.256.jpg` 
        : "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400"; // Fallback

      const title = m.attributes?.title?.es || m.attributes?.title?.["es-la"] || m.attributes?.title?.en || (m.attributes?.title && Object.values(m.attributes?.title)[0]);
      const lastChapterStr = m.attributes?.lastChapter;
      const lastChapter = lastChapterStr ? parseFloat(lastChapterStr) : 0;
      const rating = statistics[m.id]?.rating?.average || 0;

      const manga: Manga = {
        id: m.id,
        title: title || "Sin título",
        synopsis: m.attributes?.description?.es || m.attributes?.description?.en || "Sinopsis no disponible.",
        coverUrl: coverUrl,
        genres: m.attributes?.tags?.filter((t: any) => t.type === "tag").map((t: any) => t.attributes?.name?.en) || [],
        status: m.attributes?.status === "ongoing" ? "En emisión" : "Finalizado",
        year: m.attributes?.year || 0,
        chaptersCount: isNaN(lastChapter) || lastChapter === 0 ? 0 : Math.floor(lastChapter),
        rating: Math.round(rating * 10) / 10
      };

      apiCache.set(cacheKey, manga, 7200); // cache for 2 hours
      res.json(manga);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch manga detail" });
    }
  });

  // 5e. Get manga chapter pages
  app.get("/api/chapter/:id/pages", async (req, res) => {
    const { id } = req.params;
    if (!id || id === 'undefined' || id === 'null' || id.length < 10) {
      return res.status(400).json({ error: "Invalid Chapter ID" });
    }

    const cacheKey = `chapter_pages_${id}`;
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) return res.json(cachedData);

    try {
      const response = await fetch(`https://api.mangadex.org/at-home/server/${id}`, {
        headers: {
          "User-Agent": "MegaAnime-App/1.2.0 (contact: BaezCabrera.J.R@gmail.com)",
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "MangaDex API error" });
      }

      const data = await response.json();
      if (!data || !data.chapter) throw new Error("Invalid response");
      
      const baseUrl = data.baseUrl;
      const hash = data.chapter.hash;
      const pages = data.chapter.data.map((fileName: string) => `${baseUrl}/data/${hash}/${fileName}`);
      
      apiCache.set(cacheKey, pages, 86400); // 24 hours
      res.json(pages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chapter pages" });
    }
  });

  // 5b. Get movies (with optional category/genre filter)
  app.get("/api/movies", async (req, res) => {
    const genre = req.query.genre as string;
    const page = parseInt(req.query.page as string, 10) || 1;
    const cacheKey = `movies_${genre || 'all'}_p${page}`;
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) return res.json(cachedData);

    try {
      const data = await fetchAniListMovies(genre, page);
      apiCache.set(cacheKey, data, 21600); // 6 hours
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch movies" });
    }
  });

  // 6. User Authentication: Login
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Todos los campos son obligatorios" });
    }

    // Standard demonstration validation (simulates registration if not found)
    const emailKey = email.toLowerCase().trim();
    if (!USERS_DB[emailKey]) {
      // Auto-register on the fly for premium feel, or require sign up
      USERS_DB[emailKey] = {
        username: email.split("@")[0],
        email: emailKey,
        favorites: []
      };
    }

    res.json({
      success: true,
      message: "Sesión iniciada con éxito",
      user: {
        id: emailKey,
        username: USERS_DB[emailKey].username,
        email: USERS_DB[emailKey].email,
        favorites: USERS_DB[emailKey].favorites
      }
    });
  });

  // 7. User Authentication: Register
  app.post("/api/auth/register", (req, res) => {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: "Todos los campos son obligatorios" });
    }

    const emailKey = email.toLowerCase().trim();
    if (USERS_DB[emailKey]) {
      return res.status(400).json({ success: false, message: "Este correo electrónico ya está registrado" });
    }

    USERS_DB[emailKey] = {
      username: username.trim(),
      email: emailKey,
      favorites: []
    };

    res.json({
      success: true,
      message: "Registro completado con éxito",
      user: {
        id: emailKey,
        username: USERS_DB[emailKey].username,
        email: USERS_DB[emailKey].email,
        favorites: USERS_DB[emailKey].favorites
      }
    });
  });

  // 8. Sync favorites (Save user favorites back to server session if logged in)
  app.post("/api/favorites/sync", (req, res) => {
    const { email, favorites } = req.body;
    if (!email || !Array.isArray(favorites)) {
      return res.status(400).json({ success: false, message: "Falta el correo o los favoritos" });
    }
    const emailKey = email.toLowerCase().trim();
    if (USERS_DB[emailKey]) {
      USERS_DB[emailKey].favorites = favorites;
    } else {
      USERS_DB[emailKey] = {
        username: email.split("@")[0],
        email: emailKey,
        favorites: favorites
      };
    }
    res.json({ success: true, favorites: USERS_DB[emailKey].favorites });
  });

  // 9. Server-side image proxy to completely bypass MAL 403 Forbidden hotlinking blocks
  app.get("/api/image-proxy", async (req, res) => {
    let imageUrl = req.query.url as string;
    const title = (req.query.title as string) || "Anime";
    const encodeParam = req.query.encode as string;

    if (encodeParam === "base64" && imageUrl) {
      try {
        imageUrl = Buffer.from(imageUrl, "base64").toString("utf-8");
      } catch (err) {
        // fallback
      }
    }

    if (!imageUrl || imageUrl === "trigger-error") {
      // Try resolving empty or broken image URLs in the backend first using AniList GraphQL
      if (title && title.toLowerCase() !== "anime" && title.toLowerCase() !== "manga" && title.toLowerCase() !== "undefined") {
        try {
          const queryStr = `
            query ($search: String, $type: MediaType) {
              Page(page: 1, perPage: 1) {
                media(search: $search, type: $type) {
                  coverImage {
                    extraLarge
                    large
                  }
                }
              }
            }
          `;
          const variables = { search: title, type: "ANIME" };
          const gqlResponse = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
            },
            body: JSON.stringify({ query: queryStr, variables }),
            signal: AbortSignal.timeout(4000)
          });

          if (gqlResponse.ok) {
            const json: any = await gqlResponse.json();
            const media = json.data?.Page?.media?.[0];
            const coverUrl = media?.coverImage?.extraLarge || media?.coverImage?.large || null;
            if (coverUrl) {
              imageUrl = coverUrl;
              console.log(`[image-proxy] Resolved empty/trigger-error cover for "${title}" directly to: ${coverUrl}`);
            }
          }
        } catch (err: any) {
          console.warn(`[image-proxy] Direct GraphQL resolve failed for "${title}":`, err.message);
        }
      }
    }

    // Serve premium SVG vector placeholder if still empty or unresolved to prevent broken image frames in UI
    if (!imageUrl || imageUrl === "trigger-error" || (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://"))) {
      res.setHeader("Content-Type", "image/svg+xml");
      res.setHeader("Cache-Control", "public, max-age=604800");
      return res.send(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450" width="100%" height="100%">
          <defs>
            <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#1f1f2e"/>
              <stop offset="100%" stop-color="#0d0d13"/>
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#g)"/>
          <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" fill="#8c8c9e">${title}</text>
        </svg>
      `);
    }

    try {
      const parsedUrl = new URL(imageUrl);
      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/*,*/*;q=0.8"
      };

      if (parsedUrl.hostname.includes("myanimelist.net")) {
        headers["Referer"] = "https://myanimelist.net/";
      } else if (parsedUrl.hostname.includes("alphacoders.com")) {
        headers["Referer"] = "https://alphacoders.com/";
      } else if (parsedUrl.hostname.includes("monoschinos.st")) {
        headers["Referer"] = "https://monoschinos.st/";
      } else if (parsedUrl.hostname.includes("mangadex.org")) {
        // MangaDex is very picky about headers - MUST NOT send User-Agent
        headers["Referer"] = "https://mangadex.org/";
        delete headers["User-Agent"];
        headers["Accept"] = "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8";
        headers["Accept-Language"] = "en-US,en;q=0.9,es;q=0.8";
      } else {
        headers["Referer"] = `${parsedUrl.protocol}//${parsedUrl.host}/`;
      }

      // Helper for serving image from wsrv.nl on the server without redirects
      const serveViaWeserv = async (url: string) => {
        try {
          const weservUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
          const weservResponse = await fetch(weservUrl, {
            signal: AbortSignal.timeout(8000)
          });
          if (weservResponse.ok) {
            res.setHeader("Content-Type", weservResponse.headers.get("content-type") || "image/jpeg");
            res.setHeader("Cache-Control", "public, max-age=604800");
            const buffer = await weservResponse.arrayBuffer();
            res.send(Buffer.from(buffer));
            return true;
          }
        } catch (e: any) {
          console.error(`wsrv.nl server-side proxy failed for: ${url}`, e.message);
        }
        return false;
      };

      if (parsedUrl.hostname.includes("mangadex.org")) {
        // MangaDex is extremely picky. We try multiple strategies.
        // Strategy 1: Direct fetch with specific headers
        try {
          const directRes = await fetch(imageUrl, {
            headers: {
              "Referer": "https://mangadex.org/",
              "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
            },
            signal: AbortSignal.timeout(5000)
          });
          if (directRes.ok) {
            res.setHeader("Content-Type", directRes.headers.get("content-type") || "image/jpeg");
            res.setHeader("Cache-Control", "public, max-age=604800");
            const buffer = await directRes.arrayBuffer();
            return res.send(Buffer.from(buffer));
          }
        } catch (e) {}

        // Strategy 2: Use wsrv.nl (Weserv) on the server
        const success = await serveViaWeserv(imageUrl);
        if (success) return;

        // Strategy 3: Try original image if this was a thumbnail
        if (imageUrl.includes(".256.jpg") || imageUrl.includes(".512.jpg")) {
          const originalUrl = imageUrl.replace(/\.(256|512)\.jpg$/, "");
          const successOrig = await serveViaWeserv(originalUrl);
          if (successOrig) return;
        }
      }

      let response = await fetch(imageUrl, {
        headers,
        signal: AbortSignal.timeout(6000)
      });

      // If direct fetch fails, try server-side wsrv.nl fallback
      if (!response.ok) {
        if (response.status !== 404) {
          console.warn(`Direct proxy fetch failed with status ${response.status} for URL: ${imageUrl}. Trying server-side wsrv.nl fallback...`);
        }
        const success = await serveViaWeserv(imageUrl);
        if (success) return;
        
        throw new Error(`Failed to fetch image directly: ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=604800"); // 7 days
      
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (error: any) {
      if (!error.message.includes("404")) {
        console.warn("Local image proxy failed, falling back to server-side wsrv.nl proxy for URL:", imageUrl, error.message);
      }
      
      // Fallback to server-side fetch from wsrv.nl to avoid redirects
      try {
        const weservUrl = `https://wsrv.nl/?url=${encodeURIComponent(imageUrl)}`;
        const weservResponse = await fetch(weservUrl, {
          signal: AbortSignal.timeout(8000)
        });
        if (weservResponse.ok) {
          res.setHeader("Content-Type", weservResponse.headers.get("content-type") || "image/jpeg");
          res.setHeader("Cache-Control", "public, max-age=604800");
          const buffer = await weservResponse.arrayBuffer();
          return res.send(Buffer.from(buffer));
        }
      } catch (err: any) {
        if (!err.message.includes("404")) {
          console.error("wsrv.nl server-side proxy fallback failed:", err.message);
        }
      }
      
      // Try searching AniList GraphQL for a valid cover using the title parameter
      if (title && title.toLowerCase() !== "anime" && title.toLowerCase() !== "manga" && title.toLowerCase() !== "undefined") {
        try {
          const variables = { search: title, page: 1, perPage: 1 };
          const queryStr = `
            query ($search: String) {
              Page(page: 1, perPage: 1) {
                media(search: $search, type: ANIME) {
                  coverImage {
                    large
                  }
                }
              }
            }
          `;
          const gqlResponse = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
            },
            body: JSON.stringify({ query: queryStr, variables }),
            signal: AbortSignal.timeout(5000)
          });
          if (gqlResponse.ok) {
            const json = await gqlResponse.json();
            const altCoverUrl = json.data?.Page?.media?.[0]?.coverImage?.large;
            if (altCoverUrl && altCoverUrl !== imageUrl) {
              console.log(`Image proxy fallback: Found alternative cover on AniList for "${title}": ${altCoverUrl}`);
              const altResponse = await fetch(altCoverUrl, {
                signal: AbortSignal.timeout(6000)
              });
              if (altResponse.ok) {
                res.setHeader("Content-Type", altResponse.headers.get("content-type") || "image/jpeg");
                res.setHeader("Cache-Control", "public, max-age=604800");
                const buffer = await altResponse.arrayBuffer();
                return res.send(Buffer.from(buffer));
              }
            }
          }
        } catch (e: any) {
          console.warn(`Image proxy fallback: AniList recovery failed for "${title}":`, e.message);
        }
      }

      // Serve beautiful dynamic server-side fallback SVG
      const isBanner = imageUrl.includes("banner") || imageUrl.includes("cover-large") || imageUrl.includes("bannerUrl") || imageUrl.includes("banner_url");
      const fallbackSvg = getSvgPlaceholder(title, isBanner);
      res.setHeader("Content-Type", "image/svg+xml");
      res.setHeader("Cache-Control", "public, max-age=604800");
      res.status(200).send(fallbackSvg);
    }
  });

  // 10. CORS-free progressive video download proxy to bypass browser restrictions
  app.get("/api/download-proxy", async (req, res) => {
    const videoUrl = req.query.url as string;
    if (!videoUrl) {
      return res.status(400).send("No video URL provided");
    }

    try {
      console.log(`Streaming proxy download request for URL: ${videoUrl}`);
      const videoRes = await fetch(videoUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(600000) // 10 minutes maximum download time
      });

      if (!videoRes.ok) {
        throw new Error(`Failed to fetch remote stream: ${videoRes.status}`);
      }

      // Propagate content-type, content-length and CORS headers
      res.setHeader("Content-Type", videoRes.headers.get("content-type") || "video/mp4");
      const contentLength = videoRes.headers.get("content-length");
      if (contentLength) {
        res.setHeader("Content-Length", contentLength);
      }
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "no-cache");

      // Stream the response in chunks directly to the client
      if (videoRes.body) {
        const reader = videoRes.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            res.write(Buffer.from(value));
          }
        }
      }
      res.end();
    } catch (err: any) {
      console.error(`Download proxy streaming failed for ${videoUrl}:`, err.message);
      res.status(500).send(`Download failed: ${err.message}`);
    }
  });

  // 11. Dynamic Hot Cover Recovery Route using AniList GraphQL API
  app.get("/api/resolve-cover", async (req, res) => {
    const title = req.query.title as string;
    const animeId = req.query.animeId as string;
    const requestedType = req.query.type as string; // "ANIME" | "MANGA"

    if (!title && !animeId) {
      return res.status(400).json({ error: "Missing title or animeId parameter" });
    }

    try {
      console.log(`Hot cover recovery requested for title: "${title}", ID: "${animeId}", Type: "${requestedType}"`);

      let cleanId = animeId ? animeId.replace(/^(consumet-|hianime-|anilist-)/, "").replace(/-ep-\d+$/, "").replace(/-\d+$/, "") : "";
      const isNumericId = /^\d+$/.test(cleanId);
      
      // Determine if media is Anime or Manga
      let mediaType = "ANIME";
      if (requestedType?.toUpperCase() === "MANGA" || animeId?.startsWith("manga-")) {
        mediaType = "MANGA";
      }

      // 1. Instant local catalog resolution
      if (mediaType === "MANGA") {
        const { MOCK_MANGAS } = await import("./src/utils/mangaDb");
        const target = MOCK_MANGAS.find(m => m.id === animeId);
        if (target && target.coverUrl) {
          console.log(`Resolved hot cover from local mangaDb: ${target.coverUrl}`);
          return res.json({ coverUrl: target.coverUrl, title: target.title });
        }
      } else {
        const { MOCK_ANIMES } = await import("./src/utils/animeDb");
        const target = MOCK_ANIMES.find(a => a.id === animeId || (a.external_id && a.external_id === cleanId));
        if (target && target.coverUrl) {
          console.log(`Resolved hot cover from local animeDb: ${target.coverUrl}`);
          return res.json({ coverUrl: target.coverUrl, title: target.title });
        }
      }

      let coverUrl: string | null = null;
      let queryStr = "";
      let variables: any = {};

      if (isNumericId) {
        // Query AniList GraphQL directly using the numerical ID (100% precise)
        const anilistId = parseInt(cleanId, 10);
        queryStr = `
          query ($id: Int, $type: MediaType) {
            Media(id: $id, type: $type) {
              title {
                english
                romaji
                native
              }
              coverImage {
                extraLarge
                large
              }
            }
          }
        `;
        variables = { id: anilistId, type: mediaType };
      } else if (title && title.toLowerCase() !== "anime" && title.toLowerCase() !== "manga" && title.toLowerCase() !== "undefined") {
        // Query AniList GraphQL using title search
        queryStr = `
          query ($search: String, $type: MediaType) {
            Page(page: 1, perPage: 1) {
              media(search: $search, type: $type) {
                title {
                  english
                  romaji
                  native
                }
                coverImage {
                  extraLarge
                  large
                }
              }
            }
          }
        `;
        variables = { search: title, type: mediaType };
      }

      let resolvedTitle: string | null = null;

      if (queryStr) {
        const gqlResponse = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({ query: queryStr, variables }),
          signal: AbortSignal.timeout(5000)
        });

        if (gqlResponse.ok) {
          const json: any = await gqlResponse.json();
          const media = isNumericId ? json.data?.Media : json.data?.Page?.media?.[0];
          coverUrl = media?.coverImage?.extraLarge || media?.coverImage?.large || null;
          resolvedTitle = media?.title?.english || media?.title?.romaji || media?.title?.native || null;
        }
      }

      if (coverUrl) {
        console.log(`Successfully recovered hot cover for ${mediaType} "${title || animeId}": ${coverUrl}`);
        
        // Dynamic memory-cache update to prevent subsequent errors in runtime
        try {
          if (mediaType === "MANGA") {
            const { MOCK_MANGAS } = await import("./src/utils/mangaDb");
            const target = MOCK_MANGAS.find(m => m.id === animeId);
            if (target) {
              target.coverUrl = coverUrl;
              if (resolvedTitle) target.title = resolvedTitle;
              console.log(`Updated coverUrl in runtime MOCK_MANGAS cache for ID: ${animeId}`);
            }
          } else {
            const { MOCK_ANIMES } = await import("./src/utils/animeDb");
            const target = MOCK_ANIMES.find(a => a.id === animeId);
            if (target) {
              target.coverUrl = coverUrl;
              if (resolvedTitle) target.title = resolvedTitle;
              console.log(`Updated coverUrl in runtime MOCK_ANIMES cache for ID: ${animeId}`);
            }
          }
        } catch (e) {}

        return res.json({ coverUrl, title: resolvedTitle });
      }

      return res.status(404).json({ error: "No cover image resolved on AniList" });
    } catch (err: any) {
      console.error(`Cover recovery failed for "${title || animeId}":`, err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // --- ADMIN ACTIONS ENDPOINTS ---

  // 1. Get all custom animes
  app.get("/api/admin/animes", (req, res) => {
    GLOBAL_CUSTOM_ANIMES = readCustomDb();
    res.json(GLOBAL_CUSTOM_ANIMES);
  });

  // 1b. Get all custom mangas
  app.get("/api/admin/mangas", (req, res) => {
    GLOBAL_CUSTOM_MANGAS = readCustomMangasDb();
    res.json(GLOBAL_CUSTOM_MANGAS);
  });

  // 2. Save/Update custom anime
  app.post("/api/admin/animes/save", (req, res) => {
    try {
      const anime = req.body;
      if (!anime || !anime.id) {
        return res.status(400).json({ error: "Invalid anime object" });
      }

      GLOBAL_CUSTOM_ANIMES = readCustomDb();
      const index = GLOBAL_CUSTOM_ANIMES.findIndex(a => a.id === anime.id);
      if (index !== -1) {
        GLOBAL_CUSTOM_ANIMES[index] = { ...GLOBAL_CUSTOM_ANIMES[index], ...anime };
      } else {
        GLOBAL_CUSTOM_ANIMES.push(anime);
      }

      writeCustomDb(GLOBAL_CUSTOM_ANIMES);
      apiCache.flushAll(); // Flush cache so it updates on home screen
      res.json({ success: true, anime });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 2b. Save/Update custom manga
  app.post("/api/admin/mangas/save", (req, res) => {
    try {
      const manga = req.body;
      if (!manga || !manga.id) {
        return res.status(400).json({ error: "Invalid manga object" });
      }

      GLOBAL_CUSTOM_MANGAS = readCustomMangasDb();
      const index = GLOBAL_CUSTOM_MANGAS.findIndex(m => m.id === manga.id);
      if (index !== -1) {
        GLOBAL_CUSTOM_MANGAS[index] = { ...GLOBAL_CUSTOM_MANGAS[index], ...manga };
      } else {
        GLOBAL_CUSTOM_MANGAS.push(manga);
      }

      writeCustomMangasDb(GLOBAL_CUSTOM_MANGAS);
      res.json({ success: true, manga });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 3. Delete custom anime
  app.post("/api/admin/animes/delete", (req, res) => {
    try {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ error: "Missing anime ID" });
      }

      GLOBAL_CUSTOM_ANIMES = readCustomDb();
      GLOBAL_CUSTOM_ANIMES = GLOBAL_CUSTOM_ANIMES.filter(a => a.id !== id);
      writeCustomDb(GLOBAL_CUSTOM_ANIMES);
      apiCache.flushAll();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 3b. Delete custom manga
  app.post("/api/admin/mangas/delete", (req, res) => {
    try {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ error: "Missing manga ID" });
      }

      GLOBAL_CUSTOM_MANGAS = readCustomMangasDb();
      GLOBAL_CUSTOM_MANGAS = GLOBAL_CUSTOM_MANGAS.filter(m => m.id !== id);
      writeCustomMangasDb(GLOBAL_CUSTOM_MANGAS);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 4. Scrape URL and add/update anime in the database
  app.post("/api/admin/animes/scrape-url", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: "Missing URL parameter" });
      }

      const lowercaseUrl = url.toLowerCase();
      const isAnimeFLV = lowercaseUrl.includes("animeflv.net");
      const isMonosChinos = lowercaseUrl.includes("monoschinos2.com") || lowercaseUrl.includes("monoschinos");

      if (!isAnimeFLV && !isMonosChinos) {
        return res.status(400).json({ error: "Only AnimeFLV and MonosChinos URLs are supported." });
      }

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
      });
      const html = await response.text();

      let title = "Scraped Anime";
      let synopsis = "";
      let coverUrl = "";
      const genres: string[] = [];
      let status = "En emisión";
      let episodesCount = 12;

      if (isAnimeFLV) {
        // Parse Title
        const titleMatch = html.match(/<h1 class="Title font-weight-bold">([^<]+)<\/h1>/i) || html.match(/<h1 class="Title">([^<]+)<\/h1>/i);
        if (titleMatch) title = titleMatch[1].trim();

        // Parse Synopsis
        const synMatch = html.match(/<div class="Description">[^]*?<p>([^<]+)<\/p>/i);
        if (synMatch) synopsis = synMatch[1].trim();

        // Parse Cover
        const coverMatch = html.match(/<div class="thumb">[^]*?<img src="([^"]+)"/i);
        if (coverMatch) {
          coverUrl = coverMatch[1];
          if (!coverUrl.startsWith("http")) {
            coverUrl = "https://animeflv.net" + coverUrl;
          }
        }

        // Parse Genres
        const genreRegex = /<a href="\/genre\/[^"]+">([^<]+)<\/a>/gi;
        let gMatch;
        while ((gMatch = genreRegex.exec(html)) !== null) {
          if (!genres.includes(gMatch[1])) genres.push(gMatch[1]);
        }

        // Parse Episodes list script to count episodes
        const epsMatch = html.match(/var episodes = \[\s*\[(\d+)/i);
        if (epsMatch) {
          episodesCount = parseInt(epsMatch[1], 10);
        } else {
          // Alternative episode regex match
          const epArrayMatch = html.match(/var episodes = \[([^\]]+)\]/i);
          if (epArrayMatch) {
            const matches = epArrayMatch[1].match(/\[(\d+),/g);
            if (matches) episodesCount = matches.length;
          }
        }
      } else if (isMonosChinos) {
        // Parse Title
        const titleMatch = html.match(/<h1 class="title-nit[^>]*>([^<]+)<\/h1>/i);
        if (titleMatch) title = titleMatch[1].trim();

        // Parse Synopsis
        const synMatch = html.match(/<p class="text-justify[^>]*>([^<]+)<\/p>/i);
        if (synMatch) synopsis = synMatch[1].trim();

        // Parse Cover
        const coverMatch = html.match(/<div class="chapter-pic">[^]*?<img[^>]+src="([^"]+)"/i);
        if (coverMatch) coverUrl = coverMatch[1];

        // Parse Genres
        const genreRegex = /<a class="btn btn-outline-primary[^>]*>([^<]+)<\/a>/gi;
        let gMatch;
        while ((gMatch = genreRegex.exec(html)) !== null) {
          if (!genres.includes(gMatch[1])) genres.push(gMatch[1]);
        }

        // Parse Episodes
        const epRegex = /class="episode-item"[^>]*>Episode\s*(\d+)/gi;
        let maxEp = 0;
        let epM;
        while ((epM = epRegex.exec(html)) !== null) {
          const num = parseInt(epM[1], 10);
          if (num > maxEp) maxEp = num;
        }
        episodesCount = maxEp || 12;
      }

      // Format ID (slugify)
      const id = title.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const newAnime = {
        id,
        title,
        synopsis,
        coverUrl,
        genres: genres.length > 0 ? genres : ["Acción"],
        status,
        rating: 8.5,
        type: "Anime",
        episodesCount,
        year: new Date().getFullYear(),
        episodes: []
      };

      GLOBAL_CUSTOM_ANIMES = readCustomDb();
      const index = GLOBAL_CUSTOM_ANIMES.findIndex(a => a.id === newAnime.id);
      if (index !== -1) {
        GLOBAL_CUSTOM_ANIMES[index] = { ...GLOBAL_CUSTOM_ANIMES[index], ...newAnime };
      } else {
        GLOBAL_CUSTOM_ANIMES.push(newAnime);
      }

      writeCustomDb(GLOBAL_CUSTOM_ANIMES);
      apiCache.flushAll();

      res.json({ success: true, anime: newAnime });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Configure middleware (Vite Dev Server vs Static Production bundle)
  const isProduction = process.env.NODE_ENV === "production" || fs.existsSync(path.join(process.cwd(), "dist/index.html"));

  if (!isProduction) {
    console.log("Starting server in DEVELOPMENT mode (booting Vite Dev Server)...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode (serving compiled dist bundle)...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { setHeaders: (res, path) => { if (path.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); } }));
    app.get("*", (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`megaAnime Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

function getSvgPlaceholder(title: string, isBanner: boolean = false): string {
  const cleanTitle = title || "Anime";
  
  // Deterministic styling based on title
  let hash = 0;
  for (let i = 0; i < cleanTitle.length; i++) {
    hash = cleanTitle.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    { start: "#111827", end: "#1f2937", text: "#f43f5e" }, // Deep Gray/Rose
    { start: "#1e1b4b", end: "#311042", text: "#a855f7" }, // Deep Indigo/Purple
    { start: "#0f172a", end: "#1e293b", text: "#38bdf8" }, // Slate/Dark Blue
    { start: "#1c1917", end: "#292524", text: "#f59e0b" }, // Stone/Dark Amber
    { start: "#022c22", end: "#064e3b", text: "#10b981" }, // Deep Green/Forest
    { start: "#1f0000", end: "#4a0000", text: "#ef4444" }  // Dark Red
  ];
  
  const selectedStyle = colors[Math.abs(hash) % colors.length];
  
  const width = isBanner ? 1200 : 400;
  const height = isBanner ? 480 : 570;
  
  // Break title into short lines to prevent overflow
  const words = cleanTitle.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    if ((currentLine + " " + word).length > (isBanner ? 28 : 14)) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine += " " + word;
    }
  }
  if (currentLine) lines.push(currentLine.trim());
  
  const displayedLines = lines.slice(0, 4);
  const textYStart = height / 2 - (displayedLines.length - 1) * (isBanner ? 22 : 18);
  
  const escapeSvgText = (str: string) => {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  };

  const textElements = displayedLines.map((line, idx) => {
    const y = textYStart + idx * (isBanner ? 44 : 36);
    return `<text x="50%" y="${y}" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="${isBanner ? "36px" : "28px"}" letter-spacing="-0.02em">${escapeSvgText(line)}</text>`;
  }).join("\n");
  
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="anime-grad-${Math.abs(hash)}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${selectedStyle.start};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${selectedStyle.end};stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <rect width="100%" height="100%" fill="url(#anime-grad-${Math.abs(hash)})" />
      
      <circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 2.8}" fill="${selectedStyle.text}" opacity="0.08" />
      <circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 1.8}" fill="#ffffff" opacity="0.01" stroke="#ffffff" stroke-width="1" />
      
      <rect x="16" y="16" width="${width - 32}" height="${height - 32}" rx="12" fill="none" stroke="${selectedStyle.text}" stroke-width="2" opacity="0.25" />

      ${textElements}
      
      <text x="50%" y="${height - 40}" dominant-baseline="middle" text-anchor="middle" fill="${selectedStyle.text}" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="12px" letter-spacing="0.3em" opacity="0.8">
        MEGAANIME OFFICIAL COVER
      </text>
    </svg>
  `.trim();
}
