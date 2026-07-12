import { Anime, Episode } from "../types";
import { getAnimesWithEpisodes, getAiringBaseCount } from "./animeDb";
import { normalizeTitle, cleanVideoSuffixes, fuzzyMatch } from "./titleNormalizer";
import dotenv from "dotenv";
dotenv.config();

const HIANIME_API_URL = process.env.HIANIME_API_URL || "http://localhost:4000";
const CONSUMET_API_URL = process.env.CONSUMET_API_URL || "http://localhost:5000";
const DST3V3_API_URL = process.env.DST3V3_API_URL || "http://localhost:8080";

// In-memory cache for Kitsu image lookups to avoid redundant API calls and keep it incredibly fast
const KITSU_IMAGE_CACHE: Record<string, { coverUrl: string; bannerUrl: string; synopsis?: string }> = {};

/**
 * Dynamically fetches high-quality official covers and banners from the Kitsu API.
 * This is 100% public, unauthenticated, unblocked, and has zero CORS/Referer issues!
 */
export async function getAnimeImagesFromKitsu(title: string): Promise<{ coverUrl: string; bannerUrl: string; synopsis?: string }> {
  // Normalize title for better Kitsu API search matching
  const cleanTitle = title
    .replace(/\(TV\)/gi, "")
    .replace(/Season \d+/gi, "")
    .replace(/Temporada \d+/gi, "")
    .replace(/:/g, "")
    .replace(/ - /g, " ")
    .trim();
    
  const cacheKey = cleanTitle.toLowerCase();
  
  if (KITSU_IMAGE_CACHE[cacheKey]) {
    return KITSU_IMAGE_CACHE[cacheKey];
  }
  
  try {
    const url = `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(cleanTitle)}&page[limit]=1`;
    const response = await fetch(url, {
      headers: {
        "Accept": "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      signal: AbortSignal.timeout(3500) // Fast 3.5s timeout
    });
    
    if (response.ok) {
      const json = await response.json();
      if (json.data && json.data.length > 0) {
        const attr = json.data[0].attributes;
        const cover = attr.posterImage?.large || attr.posterImage?.original || attr.posterImage?.medium || "";
        const banner = attr.coverImage?.large || attr.coverImage?.original || attr.coverImage?.small || "";
        const synopsis = attr.synopsis || attr.description || "";
        
        if (cover) {
          const result = {
            coverUrl: cover,
            bannerUrl: banner || cover,
            synopsis
          };
          KITSU_IMAGE_CACHE[cacheKey] = result;
          return result;
        }
      }
    }
  } catch (err) {
    console.warn(`Kitsu lookup failed for "${title}":`, err);
  }
  
  return { coverUrl: "", bannerUrl: "", synopsis: "" };
}

// User-Agent to mimic a real browser to bypass basic scraper blocks
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
};
/**
 * Normalizes an image or link from AnimeID to be fully-qualified.
 */
function normalizeUrl(url: string | undefined): string {
  if (!url) return "";
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `https://www.animeid.tv${url}`;
  return url;
}

/**
 * Scrapes the home page of AnimeID.
 * Captures latest episodes, popular shows, and seasonal shows.
 */

// Helper to fetch from Jikan
async function fetchSeasonalFromJikan(year: number, season: string): Promise<Anime[]> {
  try {
    const response = await fetch(`https://api.jikan.moe/v4/seasons/${year}/${season}`);
    const data = await response.json();
    if (!data.data) return [];
    
    return data.data.map((item: any) => ({
      id: item.mal_id.toString(),
      title: item.title,
      synopsis: item.synopsis || "No synopsis available",
      coverUrl: item.images.jpg.image_url,
      bannerUrl: item.images.jpg.large_image_url || item.images.jpg.image_url,
      genres: item.genres.map((g: any) => g.name),
      status: item.airing ? "En emisión" : "Finalizado",
      rating: item.score || (7.0 + (item.mal_id % 25) / 10),
      type: item.type === "Movie" ? "Película" : "Anime",
      episodesCount: item.episodes || 0,
      year: item.year || year,
      episodes: []
    }));
  } catch (e) {
    console.error("Jikan API error:", e);
    return [];
  }
}

export let GLOBAL_EPISODES_CACHE: Episode[] = [];

export async function updateEpisodesRepository() {
  console.log("Running scheduled task: Updating episodes repository...");
  try {
    const response = await fetch("https://www.animeid.tv/", {
      headers: HEADERS,
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const html = await response.text();
    
    const epRegex = /<a href="\/v\/([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let epMatch;
    
    const newEpisodes: Episode[] = [];
    while ((epMatch = epRegex.exec(html)) !== null && newEpisodes.length < 16) {
      const slug = epMatch[1];
      const innerHtml = epMatch[2];
      
      const imgMatch = innerHtml.match(/src="([^"]+)"/i);
      const titleMatch = innerHtml.match(/<strong[^>]*>([^<]+)<\/strong>/i) || innerHtml.match(/class="title"[^>]*>([^<]+)</i) || innerHtml.match(/class="name"[^>]*>([^<]+)</i);
      const numMatch = innerHtml.match(/class="num"[^>]*>([^<]+)</i) || innerHtml.match(/<span[^>]*>([^<]*Episodio[^<]*)<\/span>/i) || innerHtml.match(/(\d+)$/);
      
      if (slug) {
        const titleStr = titleMatch ? titleMatch[1].trim() : slug.replace(/-/g, " ").replace(/\d+$/, "").trim();
        const numStr = numMatch ? numMatch[1].trim() : "Episodio";
        const cover = imgMatch ? normalizeUrl(imgMatch[1]) : "";
        const animeId = slug.split("-").slice(0, -1).join("-") || "unknown";
        
        // REGLA ABSOLUTA: Solo agregar si no existe en la DB, sin modificar los episodios viejos
        if (!GLOBAL_EPISODES_CACHE.some(ep => ep.id === slug)) {
          newEpisodes.push({
            id: slug,
            title: `${titleStr} - ${numStr}`,
            number: parseInt(numStr.replace(/\D/g, "")) || 1,
            animeId: animeId,
            animeTitle: titleStr,
            coverUrl: cover,
            videoUrl: `https://www.animeid.tv/v/${slug}`
          });
        }
      }
    }
    
    // Enrich the new episodes with Kitsu images
    const enrichedNewEpisodes = await Promise.all(
      newEpisodes.map(async (ep) => {
        const kitsu = await getAnimeImagesFromKitsu(ep.animeTitle || ep.title);
        return {
          ...ep,
          coverUrl: kitsu.coverUrl || ep.coverUrl || "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400"
        };
      })
    );
    
    // Unshift to add to the beginning of the cache array
    GLOBAL_EPISODES_CACHE.unshift(...enrichedNewEpisodes);
    
    // Trim cache to keep it from growing infinitely (e.g., max 200 episodes)
    if (GLOBAL_EPISODES_CACHE.length > 200) {
       GLOBAL_EPISODES_CACHE = GLOBAL_EPISODES_CACHE.slice(0, 200);
    }
    
    console.log(`Repository update complete. Added ${enrichedNewEpisodes.length} new episodes.`);
  } catch (error) {
    console.error("Failed to update episodes repository:", error);
  }
}

export async function scrapeHome(page: number = 1) {
  try {
    const [episodes, trending, seasonal] = await Promise.all([
      AnimeApiAggregator.getRecentEpisodes(),
      AnimeApiAggregator.getTrending(),
      AnimeApiAggregator.getAiring(page)
    ]);

    return {
      success: true,
      episodes,
      trending,
      seasonal,
      totalPages: 10, // Supports up to 200 airing shows paginated
      source: "API Aggregator"
    };
  } catch (error: any) {
    console.error("scrapeHome failed:", error);
    // Fallback to local DB
    const localDb = getAnimesWithEpisodes();
    return {
      success: true,
      episodes: generateMockRecentEpisodes(localDb),
      trending: localDb.slice(0, 15),
      seasonal: localDb.filter(a => a.status === "En emisión").slice((page - 1) * 24, page * 24),
      totalPages: Math.ceil(localDb.filter(a => a.status === "En emisión").length / 24),
      source: "Local Database Fallback"
    };
  }
}

/**
 * Scrapes a single anime's details by id.
 */
export async function scrapeAnime(id: string): Promise<Anime> {
  try {
    return await AnimeApiAggregator.getDetails(id);
  } catch (error) {
    console.warn(`Anime details API lookup failed for ID "${id}":`, error);
    let cleanId = id;
    if (cleanId.includes("-episodio")) {
      cleanId = cleanId.split("-episodio")[0];
    }
    if (cleanId.startsWith("anilist-")) {
      cleanId = cleanId.replace("anilist-", "consumet-");
    }
    const localDb = getAnimesWithEpisodes();
    const cleanExternalId = cleanId.replace(/^(consumet-|hianime-)/, "");
    const matchedLocal = localDb.find(a => 
      a.id === cleanId || 
      (a.external_id && a.external_id === cleanExternalId)
    );
    if (matchedLocal) return matchedLocal;
    throw new Error(`Anime not found: ${id}`);
  }
}

export async function scrapeSearch(query: string, page: number = 1): Promise<Anime[]> {
  try {
    return await AnimeApiAggregator.search(query, page);
  } catch (error) {
    console.warn(`Search failed for "${query}":`, error);
    const localDb = getAnimesWithEpisodes();
    const lowercaseQuery = query.toLowerCase().trim();
    return localDb.filter(
      a => a.title.toLowerCase().includes(lowercaseQuery) || 
           a.synopsis.toLowerCase().includes(lowercaseQuery) ||
           a.genres.some(g => g.toLowerCase().includes(lowercaseQuery))
    );
  }
}

const ANILIST_TITLE_CACHE: Record<string, string> = {};

export function translateGenre(genre: string): string {
  const clean = (genre || "").trim().toLowerCase();
  const map: Record<string, string> = {
    // English/Japanese to Spanish
    "action": "Acción",
    "adventure": "Aventura",
    "comedy": "Comedia",
    "drama": "Drama",
    "fantasy": "Fantasía",
    "romance": "Romance",
    "sci-fi": "Ciencia Ficción",
    "slice of life": "Recuentos de la vida",
    "horror": "Terror",
    "supernatural": "Sobrenatural",
    "mystery": "Misterio",
    "psychological": "Psicológico",
    "sports": "Deportes",
    "mecha": "Mecha",
    "thriller": "Misterio",
    "music": "Música",
    "sliceoflife": "Recuentos de la vida",
    "sci_fi": "Ciencia Ficción",
    "suspense": "Misterio",
    "ecchi": "Comedia",
    "harem": "Comedia",
    "historical": "Aventura",
    "martial arts": "Acción",
    "martial_arts": "Acción",
    "super power": "Acción",
    "super_power": "Acción",
    "military": "Acción",
    "school": "Escolar",
    "isekai": "Isekai",
    "shounen": "Shounen",
    "seinen": "Seinen",
    "shoujo": "Shoujo",
    "josei": "Josei",

    // Accented / Spanish unaccented fallbacks
    "accion": "Acción",
    "aventura": "Aventura",
    "comedia": "Comedia",
    "fantasia": "Fantasía",
    "ciencia ficcion": "Ciencia Ficción",
    "recuentos de la vida": "Recuentos de la vida",
    "sobrenatural": "Sobrenatural",
    "misterio": "Misterio",
    "psicologico": "Psicológico",
    "musica": "Música",
    "deportes": "Deportes",
    "suspenso": "Misterio"
  };
  return map[clean] || (genre.charAt(0).toUpperCase() + genre.slice(1));
}

export function mapSpanishGenreToEnglish(genre: string): string {
  const map: Record<string, string> = {
    "Acción": "Action",
    "Aventura": "Adventure",
    "Comedia": "Comedy",
    "Drama": "Drama",
    "Fantasía": "Fantasy",
    "Romance": "Romance",
    "Ciencia Ficción": "Sci-Fi",
    "Shounen": "Shounen",
    "Seinen": "Seinen",
    "Recuentos de la vida": "Slice of Life",
    "Terror": "Horror",
    "Sobrenatural": "Supernatural",
    "Misterio": "Mystery",
    "Psicológico": "Psychological",
    "Escolar": "School",
    "Deportes": "Sports",
    "Mecha": "Mecha",
    "Isekai": "Isekai"
  };
  return map[genre] || genre;
}

export async function fetchAniListAnimes(query: string, limit: number = 24): Promise<Anime[]> {
  const isGenre = [
    "Acción", "Aventura", "Comedia", "Drama", "Fantasía", "Romance", 
    "Ciencia Ficción", "Recuentos de la vida", 
    "Terror", "Sobrenatural", "Misterio", "Psicológico", 
    "Deportes", "Mecha"
  ].some(g => g.toLowerCase() === query.toLowerCase().trim());

  const tagsList = ["Shounen", "Seinen", "Escolar", "Isekai"];
  const isTag = tagsList.some(t => t.toLowerCase() === query.toLowerCase().trim());

  let variables: any = {};
  let graphQLQuery = "";

  if (isTag) {
    const englishTag = mapSpanishGenreToEnglish(query.trim());
    variables = { tag: englishTag };
    graphQLQuery = `
      query ($tag: String) {
        Page (page: 1, perPage: ${limit}) {
          media (tag: $tag, type: ANIME, sort: POPULARITY_DESC) {
            id
            title {
              romaji
              english
              native
            }
            description
            coverImage {
              extraLarge
              large
            }
            bannerImage
            genres
            status
            averageScore
            format
            episodes
            seasonYear
          }
        }
      }
    `;
  } else if (isGenre) {
    const englishGenre = mapSpanishGenreToEnglish(query.trim());
    variables = { genre: englishGenre };
    graphQLQuery = `
      query ($genre: String) {
        Page (page: 1, perPage: ${limit}) {
          media (genre: $genre, type: ANIME, sort: POPULARITY_DESC) {
            id
            title {
              romaji
              english
              native
            }
            description
            coverImage {
              extraLarge
              large
            }
            bannerImage
            genres
            status
            averageScore
            format
            episodes
            seasonYear
          }
        }
      }
    `;
  } else {
    variables = { search: query };
    graphQLQuery = `
      query ($search: String) {
        Page (page: 1, perPage: ${limit}) {
          media (search: $search, type: ANIME, sort: POPULARITY_DESC) {
            id
            title {
              romaji
              english
              native
            }
            description
            coverImage {
              extraLarge
              large
            }
            bannerImage
            genres
            status
            averageScore
            format
            episodes
            seasonYear
          }
        }
      }
    `;
  }

  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        query: graphQLQuery,
        variables
      }),
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) {
      console.warn("AniList GraphQL API call failed with status:", res.status);
      return [];
    }

    const json = await res.json();
    const mediaList = json?.data?.Page?.media || [];

    return mediaList.map((media: any) => {
      const title = media.title.english || media.title.romaji || media.title.native || "Anime Sin Título";
      const slugId = `anilist-${media.id}`;
      ANILIST_TITLE_CACHE[slugId] = title;

      const mappedGenres = (media.genres || []).map((g: string) => translateGenre(g));

      let cleanSynopsis = (media.description || "No hay sinopsis disponible.")
        .replace(/<br>/gi, "\n")
        .replace(/<[^>]*>/g, "")
        .trim();

      const coverUrl = media.coverImage.extraLarge || media.coverImage.large || "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400";
      const bannerUrl = media.bannerImage || coverUrl;

      let status: "En emisión" | "Finalizado" | "Próximamente" = "Finalizado";
      if (media.status === "RELEASING") status = "En emisión";
      else if (media.status === "NOT_YET_RELEASED") status = "Próximamente";

      let type: "Anime" | "Película" | "OVA" | "Especial" = "Anime";
      if (media.format === "MOVIE") type = "Película";
      else if (media.format === "OVA") type = "OVA";
      else if (media.format === "SPECIAL") type = "Especial";

      return {
        id: slugId,
        title,
        synopsis: cleanSynopsis,
        coverUrl,
        bannerUrl,
        genres: mappedGenres,
        status,
        rating: media.averageScore ? Number((media.averageScore / 10).toFixed(1)) : 8.0,
        type,
        episodesCount: media.episodes || 12,
        year: media.seasonYear || 2024,
        episodes: []
      };
    });
  } catch (err: any) {
    console.error("Error fetching from AniList API:", err.message);
    return [];
  }
}

async function getAniListTitle(anilistId: string): Promise<string> {
  const cleanId = anilistId.replace("anilist-", "");
  if (ANILIST_TITLE_CACHE[anilistId]) {
    return ANILIST_TITLE_CACHE[anilistId];
  }
  if (ANILIST_TITLE_CACHE[cleanId]) {
    return ANILIST_TITLE_CACHE[cleanId];
  }
  try {
    const q = `
      query ($id: Int) {
        Media (id: $id, type: ANIME) {
          title {
            english
            romaji
            native
          }
        }
      }
    `;
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q, variables: { id: parseInt(cleanId, 10) } }),
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const json = await res.json();
      const media = json?.data?.Media;
      const title = media?.title?.english || media?.title?.romaji || media?.title?.native || "";
      if (title) {
        ANILIST_TITLE_CACHE[anilistId] = title;
        ANILIST_TITLE_CACHE[cleanId] = title;
        return title;
      }
    }
  } catch (err) {
    console.warn("Error getting AniList title:", err);
  }
  return "";
}

interface AniListTitles {
  english: string;
  romaji: string;
  native: string;
}

const ANILIST_DETAILED_CACHE: Record<string, AniListTitles> = {};

async function getAniListTitlesDetailed(anilistId: string): Promise<AniListTitles | null> {
  const cleanId = anilistId.replace("anilist-", "");
  if (ANILIST_DETAILED_CACHE[anilistId]) {
    return ANILIST_DETAILED_CACHE[anilistId];
  }
  try {
    const q = `
      query ($id: Int) {
        Media (id: $id, type: ANIME) {
          title {
            english
            romaji
            native
          }
        }
      }
    `;
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q, variables: { id: parseInt(cleanId, 10) } }),
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const json = await res.json();
      const media = json?.data?.Media;
      if (media?.title) {
        const result = {
          english: media.title.english || "",
          romaji: media.title.romaji || "",
          native: media.title.native || ""
        };
        ANILIST_DETAILED_CACHE[anilistId] = result;
        return result;
      }
    }
  } catch (err) {
    console.warn("Error getting detailed AniList titles:", err);
  }
  return null;
}




const MONOSCHINOS_SLUG_MAP: Record<string, string> = {
  "one-punch-man-3": "one-punch-man-3",
  "one-punch-man-season-3": "one-punch-man-3",
  "one-punch-man": "one-punch-man",
  "one-punch-man-2": "one-punch-man-2nd-season",
  "one-punch-man-ii": "one-punch-man-2nd-season",
  "bleach-tybw-3": "bleach-sennen-kessen-hen-3",
  "bleach-tybw-2": "bleach-sennen-kessen-hen-2",
  "blue-lock-2": "blue-lock-2nd-season",
  "blue-lock-season-2": "blue-lock-2nd-season",
  "danmachi-5": "dungeon-ni-deai-wo-motomeru-no-wa-machigatteiru-darou-ka-v",
  "danmachi-v": "dungeon-ni-deai-wo-motomeru-no-wa-machigatteiru-darou-ka-v",
  "shangri-la-frontier-2": "shangri-la-frontier-season-2",
  "rezero-3": "re-zero-kara-hajimeru-isekai-seikatsu-3rd-season",
  "re-zero-3": "re-zero-kara-hajimeru-isekai-seikatsu-3rd-season",
  "re-zero-season-3": "re-zero-kara-hajimeru-isekai-seikatsu-3rd-season",
  "consumet-178789": "mushoku-tensei-isekai-ittara-honki-dasu-temporada-3",
  "178789": "mushoku-tensei-isekai-ittara-honki-dasu-temporada-3",
  "mushoku-tensei-3": "mushoku-tensei-isekai-ittara-honki-dasu-temporada-3",
  "mushoku-tensei-iii-isekai-ittara-honki-dasu": "mushoku-tensei-isekai-ittara-honki-dasu-temporada-3",
  "one-piece": "one-piece",
  "that-time-i-got-reincarnated-as-a-slime-1": "tensei-shitara-slime-datta-ken",
  "that-time-i-got-reincarnated-as-a-slime-2": "tensei-shitara-slime-datta-ken-2nd-season",
  "that-time-i-got-reincarnated-as-a-slime-3": "tensei-shitara-slime-datta-ken-3rd-season",
  "that-time-i-got-reincarnated-as-a-slime-4": "tensei-shitara-slime-datta-ken-3",
  "that-time-i-got-reincarnated-as-a-slime-tv-4": "tensei-shitara-slime-datta-ken-3",
  "tensei-shitara-slime-datta-ken-4": "tensei-shitara-slime-datta-ken-3",
  "tensei-shitara-slime-datta-ken-iv": "tensei-shitara-slime-datta-ken-3",
  "bleach-sennen-kessen-hen-3": "bleach-sennen-kessen-hen-3",
  "kimetsu-no-yaiba-hashira-geiko-hen": "kimetsu-no-yaiba-hashira-geiko-hen",
  "demon-slayer-kimetsu-no-yaiba-mugen-train-arc": "kimetsu-no-yaiba-mugen-ressha-hen-tv",
  "kaiju-no-8": "kaijuu-8-gou",
  "solo-leveling": "ore-dake-level-up-na-ken",
  "the-villager-of-level-999": "yamada-kun-to-lv999-no-koi-wo-suru",
  "the-villager-of-level-999-sub-espanol": "yamada-kun-to-lv999-no-koi-wo-suru",
  "anilist-197715": "yamada-kun-to-lv999-no-koi-wo-suru",
  "197715": "yamada-kun-to-lv999-no-koi-wo-suru",
  "jujutsu-kaisen-tv": "jujutsu-kaisen",
  "jujutsu-kaisen-tv-2": "jujutsu-kaisen-2nd-season",
  "chainsaw-man": "chainsaw-man",
  "oshi-no-ko": "oshi-no-ko",
  "oshi-no-ko-2nd-season": "oshi-no-ko-2nd-season",
  "boku-no-hero-academia-7th-season": "boku-no-hero-academia-7th-season",
  "frieren-beyond-journeys-end": "sousou-no-frieren",
  "mushoku-tensei-ii-isekai-ittara-honki-dasu": "mushoku-tensei-isekai-ittara-honki-dasu-2nd-season",
  "shingeki-no-kyojin-the-final-season": "shingeki-no-kyojin-the-final-season",
  "death-note": "death-note",
  "horimiya": "horimiya",
  "cyberpunk-edgerunners": "cyberpunk-edgerunners",
  "dandadan": "dandadan",
  "bleach-sennen-kessen-hen-soukatsu-hen": "bleach-sennen-kessen-hen",
  "re-zero-kara-hajimeru-isekai-seikatsu-3rd-season": "re-zero-kara-hajimeru-isekai-seikatsu-3rd-season",
  "kono-subarashii-sekai-ni-shukufuku-wo-3": "kono-subarashii-sekai-ni-shukufuku-wo-3",
  "wistoria-wand-sword": "wistoria-wand-and-sword",
  "blue-lock-vs-u-20-japan": "blue-lock-2nd-season",
  "wind-breaker": "wind-breaker",
  "tokidoki-bosotto-russia-go-de-dereru-tonari-no-alya-san": "tokidoki-bosotto-roshia-go-de-dereru-tonari-no-alya-san",
  "mashle-shinka-no-kami-shiken-hen": "mashle-2nd-season",
  "boku-no-kokoro-no-yabai-yatsu-2nd-season": "boku-no-kokoro-no-yabai-yatsu-2nd-season",
  "youjo-senki-2": "youjo-senki-ii",
  "youjo-senki-ii": "youjo-senki-ii",
  "youjo-senki-temporada-2": "youjo-senki-ii",
  "solo-leveling-2": "ore-dake-level-up-na-ken-2nd-season",
  "chainsaw-man-2": "chainsaw-man-2nd-season",
  "jujutsu-kaisen-tv-3": "jujutsu-kaisen-3rd-season",
  "kimetsu-no-yaiba-mugen-jou": "kimetsu-no-yaiba-mugen-jou",
  "naruto-shippuden": "naruto-shippuden",
  "dragon-ball-daima": "dragon-ball-daima",
  "bleach-sennen-kessen-hen": "bleach-sennen-kessen-hen",
  "hunter-x-hunter-2011": "hunter-x-hunter-2011",
  "black-clover": "black-clover",
  "shingeki-no-kyojin": "shingeki-no-kyojin"
};

export async function verifyVideoServers(servers: Array<{ name: string; url: string }>, domain: string, limit: number = 4): Promise<Array<{ name: string; url: string }>> {
  const PREFERRED_SERVERS = ["ok", "filemoon", "mp4upload", "mega", "yourupload", "fembed", "mixdrop", "streamtape", "dood", "voe", "burst", "streamsb", "ruvid", "vidguard", "uqload", "vidmoly", "streamvid"];
  
  // 1. Sort by preference first
  const sorted = [...servers].sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    let aScore = 99;
    let bScore = 99;
    if (aName.includes("ok")) aScore = 0;
    if (bName.includes("ok")) bScore = 0;
    if (aName.includes("filemoon")) aScore = Math.min(aScore, 1);
    if (bName.includes("filemoon")) bScore = Math.min(bScore, 1);
    if (aName.includes("mega")) aScore = Math.min(aScore, 2);
    if (bName.includes("mega")) bScore = Math.min(bScore, 2);
    PREFERRED_SERVERS.forEach((pref, index) => {
      if (aName.includes(pref)) aScore = Math.min(aScore, index + 10);
      if (bName.includes(pref)) bScore = Math.min(bScore, index + 10);
    });
    return aScore - bScore;
  });

  // 2. Verify top candidates in parallel for speed
  const candidates = sorted.slice(0, 10);
  const verificationPromises = candidates.map(async (server) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // Increased to 5s
      
      const response = await fetch(server.url, {
        method: "GET", // Changed from HEAD for better compatibility
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          "Referer": domain
        }
      });
      
      clearTimeout(timeoutId);
      
      // Some hosts block HEAD but allow GET, so 405/403/401 might be false positives for "dead"
      if (response.status === 404 || response.status >= 500) {
        return null;
      }
      
      return server;
    } catch {
      // Network error or timeout - assume potentially problematic
      return null;
    }
  });

  const results = await Promise.all(verificationPromises);
  const verified = results.filter((s): s is { name: string; url: string } => s !== null);

  // Return verified servers if any, otherwise fallback to top sorted candidates
  if (verified.length > 0) {
    return verified.slice(0, limit);
  }
  return sorted.slice(0, limit);
}

/**
 * Backup scraper that fetches video stream links from AnimeFLV.
 */
async function scrapeEpisodeFromAnimeFLV(
  id: string,
  animeId: string,
  finalEpNum: number,
  isMovie: boolean,
  matchedAnimeTitle?: string,
  alTitles?: any | null
): Promise<Array<{ name: string; url: string }>> {
  const domains = [
    "https://www3.animeflv.net",
    "https://animeflv.net"
  ];

  const queriesToTry: string[] = [];
  if (alTitles) {
    if (alTitles.romaji) queriesToTry.push(alTitles.romaji);
    if (alTitles.english) queriesToTry.push(alTitles.english);
  }
  const fallbackTitle = matchedAnimeTitle || animeId.replace(/-/g, " ");
  if (fallbackTitle) {
    queriesToTry.push(fallbackTitle);
  }

  const cleanQueryForFLV = (q: string): string => {
    return q
      .toLowerCase()
      .replace(/season \d+/gi, "")
      .replace(/temporada \d+/gi, "")
      .replace(/\d+(st|nd|rd|th) season/gi, "")
      .replace(/tv/gi, "")
      .replace(/[:.\-()\[\]]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const uniqueQueries = Array.from(new Set(
    queriesToTry.map(q => cleanQueryForFLV(q)).filter(Boolean)
  ));

  const queriesToTryCleaned = [...uniqueQueries];
  if (queriesToTryCleaned.length === 0) {
    queriesToTryCleaned.push(animeId.replace(/-/g, " "));
  }

  const query = queriesToTryCleaned[0];
  let flvSlug = "";
  let browser;

  try {
    const puppeteerModule = await import("puppeteer");
    const puppeteer = puppeteerModule.default || puppeteerModule;
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36");

    // 1. Search for the anime slug
    for (const domain of domains) {
      const searchUrl = `${domain}/browse?q=${encodeURIComponent(query)}`;
      try {
        await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 8000 });
        const html = await page.content();
        const regex = /\/anime\/([a-zA-Z0-9-]+)/gi;
        let match;
        const candidates: Array<{ slug: string; score: number }> = [];

        while ((match = regex.exec(html)) !== null) {
          const foundSlug = match[1];
          const targetWords = query.split(/\s+/);
          const slugWords = foundSlug.split("-");
          let score = 0;
          for (const w of slugWords) {
            if (targetWords.includes(w)) {
              score += 1;
            }
          }
          
          // Shorter slug length bonus (penalty for extra words)
          score -= (slugWords.length - targetWords.length) * 0.1;
          
          // Penalty for movie/special keywords if not a movie
          const movieKeywords = ["movie", "pelicula", "film", "special", "ova", "ona", "3d", "crossover", "especiales", "episode-of", "sorajima", "east-blue", "recap"];
          const containsMovieWord = movieKeywords.some(w => foundSlug.toLowerCase().includes(w));
          if (isMovie) {
            if (containsMovieWord) score += 2;
          } else {
            if (containsMovieWord) score -= 6;
          }

          // Exact match bonus
          if (foundSlug.replace(/-tv$/, "") === query.replace(/\s+/g, "-")) {
            score += 4;
          }

          candidates.push({ slug: foundSlug, score });
        }

        if (candidates.length > 0) {
          candidates.sort((a, b) => b.score - a.score);
          flvSlug = candidates[0].slug;
          break;
        }
      } catch (e) {
        // ignore and try next
      }
    }

    if (!flvSlug) {
      flvSlug = animeId.replace("consumet-", "").replace("hianime-", "");
    }

    // 2. Go to the episode page
    const epUrlCandidates: string[] = [];
    for (const domain of domains) {
      if (isMovie) {
        epUrlCandidates.push(`${domain}/ver/${flvSlug}-pelicula`);
        epUrlCandidates.push(`${domain}/ver/${flvSlug}-1`);
      } else {
        epUrlCandidates.push(`${domain}/ver/${flvSlug}-${finalEpNum}`);
      }
    }

    const servers: Array<{ name: string; url: string }> = [];
    let activeUrlUsed = "";

    for (const candidateUrl of epUrlCandidates) {
      try {
        await page.goto(candidateUrl, { waitUntil: "domcontentloaded", timeout: 8000 });
        activeUrlUsed = candidateUrl;
        
        // Extract global window.videos parsed by the page
        const parsedVideos = await page.evaluate(() => {
          return (window as any).videos || null;
        });

        if (parsedVideos) {
          const list = parsedVideos.SUB || parsedVideos.LAT || [];
          for (const item of list) {
            let codeUrl = item.code || item.url;
            if (codeUrl) {
              codeUrl = codeUrl.replace(/\\/g, "");
              if (codeUrl.startsWith("//")) codeUrl = "https:" + codeUrl;
              
              let sName = item.title || item.server || "Servidor";
              sName = sName.charAt(0).toUpperCase() + sName.slice(1).toLowerCase();
              
              if (!servers.some(s => s.url === codeUrl)) {
                servers.push({
                  name: `${sName} (FLV)`,
                  url: codeUrl
                });
              }
            }
          }
        }

        // Also fetch default fallback iframes
        const iframes = await page.evaluate(() => {
          const frames = Array.from(document.querySelectorAll("iframe"));
          return frames.map(f => f.src).filter(Boolean);
        });

        for (const src of iframes) {
          if (!src.includes("ads") && !src.includes("doubleclick") && !src.includes("analytics") && !src.includes("google")) {
            let finalUrl = src.startsWith("//") ? `https:${src}` : src;
            if (finalUrl.startsWith("http://")) {
              finalUrl = "https://" + finalUrl.substring(7);
            }
            if (!servers.some(s => s.url === finalUrl)) {
              servers.push({
                name: src.includes("mega.nz") ? "Mega (FLV)" : src.includes("ok.ru") ? "Ok (FLV)" : "Mirror (FLV)",
                url: finalUrl
              });
            }
          }
        }

        if (servers.length > 0) {
          break;
        }
      } catch (e) {
        // try next candidate url
      }
    }

    if (servers.length === 0 && activeUrlUsed) {
      console.log(`AnimeFLV direct player extraction returned 0, pushing web page iframe as backup: ${activeUrlUsed}`);
      servers.push({
        name: "Reproductor Web AnimeFLV",
        url: activeUrlUsed
      });
    }

    return servers;
  } catch (err) {
    console.error("Puppeteer AnimeFLV scraping failed:", err);
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Scrapes episode video servers from MonosChinos.
 */
async function scrapeEpisodeFromMonosChinos(
  id: string,
  animeId: string,
  finalEpNum: number,
  isMovie: boolean,
  matchedAnimeTitle?: string,
  alTitles?: AniListTitles | null
): Promise<Array<{ name: string; url: string }>> {
  const domains = [
    "https://monoschinos2.com",
    "https://monoschinos3.com",
    "https://monoschinos2.net",
    "https://monoschinos.net",
    "https://monoschinos.st",
    "https://monoschinos.to",
    "https://monoschinos.org",
    "https://monoschinos.run",
    "https://monoschinos.app",
    "https://monoschinos.site",
    "https://monoschinos.asia",
    "https://monoschinos.top",
    "https://monoschinos.icu"
  ];

  const cleanQueryForMonosChinos = (q: string): string => {
    return q
      .toLowerCase()
      .replace(/season \d+/gi, "")
      .replace(/temporada \d+/gi, "")
      .replace(/\d+(st|nd|rd|th) season/gi, "")
      .replace(/tv/gi, "")
      .replace(/[:.\-()\[\]]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const domainChunks: string[][] = [];
  for (let i = 0; i < domains.length; i += 3) {
    domainChunks.push(domains.slice(i, i + 3));
  }

  for (const chunk of domainChunks) {
    try {
      const results = await Promise.all(chunk.map(async (domain) => {
        try {
          let slug = MONOSCHINOS_SLUG_MAP[animeId];
          if (!slug) {
            const searchQueries: string[] = [];
            if (alTitles) {
              if (alTitles.romaji) searchQueries.push(alTitles.romaji);
              if (alTitles.english) searchQueries.push(alTitles.english);
            }
            const fallbackTitle = matchedAnimeTitle || animeId.replace(/-/g, " ");
            if (fallbackTitle) searchQueries.push(fallbackTitle);

            const uniqueQueries = Array.from(new Set(
              searchQueries.map(q => cleanQueryForMonosChinos(q)).filter(Boolean)
            ));

            const queriesToTry: string[] = [];
            for (const q of uniqueQueries) {
              queriesToTry.push(q);
              const words = q.split(/\s+/);
              if (words.length > 3) queriesToTry.push(words.slice(0, 3).join(" "));
            }
            const finalQueries = Array.from(new Set(queriesToTry)).slice(0, 3);

            for (const query of finalQueries) {
              const searchUrl = `${domain}/buscar?q=${encodeURIComponent(query)}`;
              const searchRes = await fetch(searchUrl, { headers: HEADERS, signal: AbortSignal.timeout(3000) });
              if (searchRes.ok) {
                const searchText = await searchRes.text();
                const searchRegex = /href=["']?(?:https?:\/\/[^\/]+)?\/anime\/([^"'\s>]+)["']?/gi;
                let searchMatch;
                const targetWords = query.split(/\s+/);
                const candidates: Array<{ slug: string; score: number }> = [];
                while ((searchMatch = searchRegex.exec(searchText)) !== null) {
                  const foundSlug = searchMatch[1].replace(/-sub-espanol$/, "");
                  const slugWords = foundSlug.split("-");
                  let score = 0;
                  for (const w of slugWords) {
                    if (targetWords.includes(w)) {
                      score += 1;
                    }
                  }

                  // Heuristic score adjustments
                  const movieKeywords = ["movie", "pelicula", "film", "special", "ova", "ona", "3d", "crossover", "especiales"];
                  const containsMovieWord = movieKeywords.some(w => foundSlug.toLowerCase().includes(w));
                  if (isMovie) {
                    if (containsMovieWord) score += 5;
                  } else {
                    if (containsMovieWord) score -= 10;
                  }

                  candidates.push({ slug: foundSlug, score });
                }
                if (candidates.length > 0) {
                  candidates.sort((a, b) => b.score - a.score || a.slug.length - b.slug.length);
                  slug = candidates[0].slug;
                  break;
                }
              }
            }
          }

          if (!slug) slug = animeId;

          const epUrlCandidates: string[] = [];
          const slugSeason = slug.replace(/-(\d+)$/, (m, p1) => {
            const n = parseInt(p1);
            const ord = ["", "st", "nd", "rd", "th"][n] || "th";
            return n > 1 ? `-${n}${ord}-season` : m;
          });
          
          if (isMovie) {
            epUrlCandidates.push(`${domain}/ver/${slug}-pelicula`, `${domain}/ver/${slug}`, `${domain}/ver/${animeId}-pelicula`);
          } else {
            epUrlCandidates.push(`${domain}/ver/${slug}-episodio-${finalEpNum}`, `${domain}/ver/${slug}-${finalEpNum}`, `${domain}/ver/${slugSeason}-episodio-${finalEpNum}`);
          }

          for (const candidateUrl of epUrlCandidates) {
            const response = await fetch(candidateUrl, {
              headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Referer": `${domain}/` },
              signal: AbortSignal.timeout(3500)
            });
            if (response.ok) {
              const html = await response.text();
              return { html, domain, url: candidateUrl };
            }
          }
        } catch (e) {
          return null;
        }
        return null;
      }));

      const successful = results.find(r => r !== null);
      if (successful) {
        const { html, domain, url: activeUrlUsed } = successful;
        const servers: Array<{ name: string; url: string }> = [];

        const playerRegex = /<[^>]*data-player=["']([^"']+)["'][^>]*>([\s\S]*?)<\//gi;
        let playerMatch;
        while ((playerMatch = playerRegex.exec(html)) !== null) {
          try {
            const rawBase64 = playerMatch[1];
            let serverName = playerMatch[2].replace(/<[^>]*>/g, "").trim();
            if (serverName.length > 50) serverName = "Server " + (servers.length + 1);
            const decodedUrl = Buffer.from(rawBase64, "base64").toString("utf-8");
            
            if (decodedUrl.startsWith("http") || decodedUrl.startsWith("//") || decodedUrl.startsWith("/")) {
              let finalUrl = decodedUrl.startsWith("//") ? `https:${decodedUrl}` : decodedUrl.startsWith("/") ? `${domain}${decodedUrl}` : decodedUrl;
              if (finalUrl.startsWith("http://")) finalUrl = "https://" + finalUrl.substring(7);
              if (!servers.some(s => s.url === finalUrl)) {
                servers.push({ name: `${serverName} (MC)`, url: finalUrl });
              }
            }
          } catch (e) {}
        }

        if (servers.length === 0) {
          const iframeRegex = /<iframe[^>]*src=["']([^"']+)["']/gi;
          let iframeMatch;
          while ((iframeMatch = iframeRegex.exec(html)) !== null && servers.length < 5) {
            const src = iframeMatch[1];
            if (!src.includes("ads") && !src.includes("analytics")) {
              let finalUrl = src.startsWith("//") ? `https:${src}` : src;
              if (finalUrl.startsWith("http://")) finalUrl = "https://" + finalUrl.substring(7);
              servers.push({ name: `Server (MC)`, url: finalUrl });
            }
          }
        }

        if (servers.length === 0 && activeUrlUsed) {
          console.log(`MonosChinos direct player extraction returned 0, pushing web page iframe as backup: ${activeUrlUsed}`);
          servers.push({
            name: "Reproductor Web MonosChinos",
            url: activeUrlUsed
          });
        }

        if (servers.length > 0) {
          return servers;
        }
      }
    } catch (error: any) {
      // Continue to next chunk
    }
  }

  return [];
}

/**
 * Grabs video players/servers for a single episode.
 */
export async function scrapeEpisode(id: string): Promise<Partial<Episode>> {
  try {
    const servers = await AnimeApiAggregator.getStreamLinks(id);
    return {
      id,
      title: `Episodio ${id.split("-").pop() || "1"}`,
      videoServers: servers,
      videoUrl: servers[0]?.url || ""
    };
  } catch (error) {
    console.warn(`Failed to resolve dynamic stream links for episode ${id}:`, error);
    const fallbackServers = [
      { name: "MegaServer Directo", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" },
      { name: "MegaServer Respaldo", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" }
    ];
    return {
      id,
      title: `Episodio ${id.split("-").pop() || "1"}`,
      videoServers: fallbackServers,
      videoUrl: fallbackServers[0].url
    };
  }
}

/**
 * HELPER: Generates mock recent episodes for the home screen fallback.
 */
function generateMockRecentEpisodes(animes: Anime[]): Episode[] {
  const list: Episode[] = [];
  animes.forEach((anime) => {
    // Add latest chapter of each anime
    const latestChapterNum = anime.episodesCount;
    list.push({
      id: `${anime.id}-${latestChapterNum}`,
      title: `${anime.title} - Episodio ${latestChapterNum}`,
      number: latestChapterNum,
      animeId: anime.id,
      animeTitle: anime.title,
      coverUrl: anime.coverUrl,
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      releaseDate: "Hoy"
    });
  });
  return list.sort(() => 0.5 - Math.random()).slice(0, 12);
}

/**
 * HELPER: Generates mock episodes for a custom anime id.
 */
function generateMockEpisodesFor(animeId: string, animeTitle: string, cover: string, isAiring: boolean = false): Episode[] {
  const episodes: Episode[] = [];
  let count = 12;
  if (isAiring) {
    const baseCount = getAiringBaseCount(animeId, 12);
    const now = new Date();
    const startOffsetDate = new Date("2026-07-02T08:00:00-04:00"); // Eastern Time offset (EDT)
    const diffMs = now.getTime() - startOffsetDate.getTime();
    let diffDays = 0;
    if (diffMs > 0) {
      diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    }
    count = baseCount + diffDays;
  }
  for (let i = 1; i <= count; i++) {
    episodes.push({
      id: `${animeId}-${i}`,
      title: `Episodio ${i}`,
      number: i,
      animeId: animeId,
      animeTitle: animeTitle,
      coverUrl: cover,
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      videoServers: [
        { name: "MegaServer 1", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" },
        { name: "Fembed Proxy", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" }
      ],
      releaseDate: `2024-05-${String(i).padStart(2, "0")}`
    });
  }
  return episodes;
}

/**
 * Fetches popular anime movies from AniList, prioritizing releases from 2025 and 2026.
 * Optionally filters by a Spanish genre category.
 */
export async function fetchAniListMovies(genre?: string, page: number = 1): Promise<Anime[]> {
  try {
    return await AnimeApiAggregator.getMovies(genre, page);
  } catch (error) {
    console.warn("fetchAniListMovies API failed:", error);
    const localDb = getAnimesWithEpisodes();
    const base = localDb.filter(a => a.type === "Película");
    if (genre && genre !== "Todas" && genre !== "Todos" && genre.toLowerCase().trim() !== "todos") {
      const lower = genre.toLowerCase().trim();
      return base.filter(m => m.genres.some(g => g.toLowerCase() === lower));
    }
    return base;
  }
}

function mapConsumetAnime(item: any): Anime {
  const title = typeof item.title === "object"
    ? (item.title.english || item.title.romaji || item.title.native || "")
    : (item.title || "");
  const status = item.status === "Airing" || item.status === "Ongoing" || item.status === "RELEASING" ? "En emisión" : "Finalizado";
  return {
    id: `consumet-${item.id}`,
    title: title,
    synopsis: item.description || "Explora este anime en megaAnime.",
    coverUrl: item.image || item.cover || "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400",
    bannerUrl: item.cover || item.image || "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400",
    genres: (item.genres || []).map((g: string) => translateGenre(g)),
    status: status,
    rating: item.rating ? Number((item.rating / 10).toFixed(1)) : 8.0,
    type: item.type === "MOVIE" ? "Película" : "Anime",
    episodesCount: item.totalEpisodes || 12,
    year: parseInt(item.releaseDate, 10) || 2024,
    episodes: [],
    title_english: typeof item.title === "object" ? item.title.english : undefined,
    title_romaji: typeof item.title === "object" ? item.title.romaji : undefined,
    title_native: typeof item.title === "object" ? item.title.native : undefined
  };
}

function mapHiAnime(item: any): Anime {
  return {
    id: `hianime-${item.id}`,
    title: item.name || item.title || "",
    synopsis: item.description || "Explora este anime en megaAnime.",
    coverUrl: item.poster || item.image || "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400",
    bannerUrl: item.poster || item.image || "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400",
    genres: (item.genres || []).map((g: string) => translateGenre(g)),
    status: item.status === "Currently Airing" ? "En emisión" : "Finalizado",
    rating: parseFloat(item.rate) || 8.0,
    type: item.type === "Movie" ? "Película" : "Anime",
    episodesCount: item.episodes?.sub || 12,
    year: 2024,
    episodes: []
  };
}

export class AnimeApiAggregator {
  static async getAiring(page: number = 1): Promise<Anime[]> {
    try {
      const data = await queryAniListGraphQL({ page, perPage: 24, status: "RELEASING" });
      if (data && data.Page && data.Page.media) {
        return data.Page.media.map(mapAniListGraphQLMedia);
      }
    } catch (e) {
      console.warn("AniList GraphQL getAiring failed, trying Consumet API...");
    }

    try {
      const res = await fetch(`${CONSUMET_API_URL}/meta/anilist/advanced-search?status=RELEASING&page=${page}&perPage=24`, {
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.results && Array.isArray(json.results)) {
          return json.results.map(mapConsumetAnime);
        }
      }
    } catch (e) {
      console.warn("Consumet getAiring failed, trying HiAnime...");
    }

    try {
      const res = await fetch(`${HIANIME_API_URL}/api/v1/anime/home`, {
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        const json = await res.json();
        const topAiring = json.data?.topAiringAnimes || [];
        if (Array.isArray(topAiring)) {
          return topAiring.slice((page - 1) * 24, page * 24).map(mapHiAnime);
        }
      }
    } catch (e) {
      console.warn("HiAnime getAiring failed, trying local DB fallback...");
    }

    const local = getAnimesWithEpisodes().filter(a => a.status === "En emisión");
    return local.slice((page - 1) * 24, page * 24);
  }

  static async getFinished(page: number = 1): Promise<Anime[]> {
    try {
      const data = await queryAniListGraphQL({ page, perPage: 24, status: "FINISHED" });
      if (data && data.Page && data.Page.media) {
        return data.Page.media.map(mapAniListGraphQLMedia);
      }
    } catch (e) {
      console.warn("AniList GraphQL getFinished failed, trying Consumet API...");
    }

    try {
      const res = await fetch(`${CONSUMET_API_URL}/meta/anilist/advanced-search?status=FINISHED&page=${page}&perPage=24`, {
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.results && Array.isArray(json.results)) {
          return json.results.map(mapConsumetAnime);
        }
      }
    } catch (e) {
      console.warn("Consumet getFinished failed, trying local DB fallback...");
    }

    const local = getAnimesWithEpisodes().filter(a => a.status === "Finalizado");
    return local.slice((page - 1) * 24, page * 24);
  }

  static async getTrending(): Promise<Anime[]> {
    try {
      const data = await queryAniListGraphQL({ page: 1, perPage: 15 });
      if (data && data.Page && data.Page.media) {
        return data.Page.media.map(mapAniListGraphQLMedia);
      }
    } catch (e) {
      console.warn("AniList GraphQL getTrending failed, trying Consumet API...");
    }

    try {
      const res = await fetch(`${CONSUMET_API_URL}/meta/anilist/trending?page=1&perPage=15`, {
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.results && Array.isArray(json.results)) {
          return json.results.map(mapConsumetAnime);
        }
      }
    } catch (e) {}
    return getAnimesWithEpisodes().slice(0, 15);
  }

  static async getRecentEpisodes(): Promise<Episode[]> {
    try {
      const res = await fetch(`${CONSUMET_API_URL}/meta/anilist/recent-episodes?page=1&perPage=12`, {
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.results && Array.isArray(json.results)) {
          return json.results.map((item: any) => ({
            id: `consumet-ep-${item.episodeId}`,
            title: `${item.title.english || item.title.romaji || item.title || ""} - Episodio ${item.episodeNumber}`,
            number: item.episodeNumber,
            animeId: `consumet-${item.id}`,
            animeTitle: item.title.english || item.title.romaji || item.title || "",
            coverUrl: item.image || item.cover || "",
            videoUrl: `/api/episode/consumet-ep-${item.episodeId}`,
            releaseDate: "Hoy"
          }));
        }
      }
    } catch (e) {}

    try {
      const data = await queryAniListGraphQL({ page: 1, perPage: 12, status: "RELEASING" });
      if (data && data.Page && data.Page.media) {
        return data.Page.media.map((media: any) => {
          const anime = mapAniListGraphQLMedia(media);
          return {
            id: `${anime.id}-ep-${anime.episodesCount}`,
            title: `${anime.title} - Episodio ${anime.episodesCount}`,
            number: anime.episodesCount,
            animeId: anime.id,
            animeTitle: anime.title,
            coverUrl: anime.coverUrl,
            videoUrl: `/api/episode/${anime.id}-ep-${anime.episodesCount}`,
            releaseDate: "Hoy"
          };
        });
      }
    } catch (e) {}

    const localDb = getAnimesWithEpisodes();
    return generateMockRecentEpisodes(localDb).slice(0, 12);
  }

  static async search(query: string, page: number = 1, status?: string): Promise<Anime[]> {
    try {
      const isGenre = [
        "Acción", "Aventura", "Comedia", "Drama", "Fantasía", "Romance", 
        "Ciencia Ficción", "Recuentos de la vida", 
        "Terror", "Sobrenatural", "Misterio", "Psicológico", 
        "Deportes", "Mecha"
      ].some(g => g.toLowerCase() === query.toLowerCase().trim());

      const tagsList = ["Shounen", "Seinen", "Escolar", "Isekai"];
      const isTag = tagsList.some(t => t.toLowerCase() === query.toLowerCase().trim());

      const variables: any = { page, perPage: 24 };
      if (isTag) {
        variables.tag = mapSpanishGenreToEnglish(query.trim());
      } else if (isGenre) {
        variables.genre = mapSpanishGenreToEnglish(query.trim());
      } else {
        variables.search = query;
      }
      if (status) {
        variables.status = status === "En emisión" ? "RELEASING" : "FINISHED";
      }

      const data = await queryAniListGraphQL(variables);
      if (data && data.Page && data.Page.media) {
        return data.Page.media.map(mapAniListGraphQLMedia);
      }
    } catch (e) {
      console.warn("AniList GraphQL search failed, trying Consumet API...");
    }

    const isGenre = [
      "Acción", "Aventura", "Comedia", "Drama", "Fantasía", "Romance", 
      "Ciencia Ficción", "Shounen", "Seinen", "Recuentos de la vida", 
      "Terror", "Sobrenatural", "Misterio", "Psicológico", "Escolar", 
      "Deportes", "Mecha", "Isekai"
    ].some(g => g.toLowerCase() === query.toLowerCase().trim());

    if (isGenre) {
      const mappedG = mapSpanishGenreToEnglish(query.trim());
      try {
        const statusParam = status ? `&status=${status}` : "";
        const res = await fetch(`${CONSUMET_API_URL}/meta/anilist/advanced-search?genres=["${mappedG}"]&page=${page}&perPage=40${statusParam}`, {
          signal: AbortSignal.timeout(4000)
        });
        if (res.ok) {
          const json = await res.json();
          if (json.results && Array.isArray(json.results)) {
            return json.results.map(mapConsumetAnime);
          }
        }
      } catch (e) {}
    } else {
      try {
        const res = await fetch(`${CONSUMET_API_URL}/meta/anilist/${encodeURIComponent(query)}?page=${page}`, {
          signal: AbortSignal.timeout(4000)
        });
        if (res.ok) {
          const json = await res.json();
          if (json.results && Array.isArray(json.results)) {
            return json.results.map(mapConsumetAnime);
          }
        }
      } catch (e) {}

      try {
        const res = await fetch(`${HIANIME_API_URL}/api/v1/anime/search?q=${encodeURIComponent(query)}&page=${page}`, {
          signal: AbortSignal.timeout(4000)
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data?.animes && Array.isArray(json.data.animes)) {
            return json.data.animes.map(mapHiAnime);
          }
        }
      } catch (e) {}
    }

    const lower = query.toLowerCase().trim();
    return getAnimesWithEpisodes().filter(a => 
      a.title.toLowerCase().includes(lower) || 
      a.synopsis.toLowerCase().includes(lower) || 
      a.genres.some(g => g.toLowerCase().includes(lower))
    );
  }

  static async getMovies(genre?: string, page: number = 1): Promise<Anime[]> {
    try {
      const variables: any = { page, perPage: 24, format: "MOVIE" };
      if (genre && genre !== "Todas" && genre !== "Todos" && genre.toLowerCase().trim() !== "todos") {
        variables.genre = mapSpanishGenreToEnglish(genre.trim());
      }
      const data = await queryAniListGraphQL(variables);
      if (data && data.Page && data.Page.media) {
        return data.Page.media.map(mapAniListGraphQLMedia);
      }
    } catch (e) {
      console.warn("AniList GraphQL getMovies failed, trying Consumet API...");
    }

    try {
      let url = `${CONSUMET_API_URL}/meta/anilist/advanced-search?format=MOVIE&page=${page}&perPage=24`;
      if (genre && genre !== "Todas" && genre !== "Todos" && genre.toLowerCase().trim() !== "todos") {
        const engG = mapSpanishGenreToEnglish(genre.trim());
        url += `&genres=["${engG}"]`;
      }
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const json = await res.json();
        if (json.results && Array.isArray(json.results)) {
          return json.results.map(mapConsumetAnime);
        }
      }
    } catch (e) {}
    const base = getAnimesWithEpisodes().filter(a => a.type === "Película");
    if (genre && genre !== "Todas" && genre !== "Todos") {
      const lower = genre.toLowerCase().trim();
      return base.filter(m => m.genres.some(g => g.toLowerCase() === lower));
    }
    return base;
  }

  static async getDetails(id: string): Promise<Anime> {
    // 1. Clean "-episodio" or trailing "-episodio-..." suffixes
    let cleanAnimeId = id;
    if (cleanAnimeId.includes("-episodio")) {
      cleanAnimeId = cleanAnimeId.split("-episodio")[0];
    }

    // Map old "anilist-" prefix to the new "consumet-" prefix
    if (cleanAnimeId.startsWith("anilist-")) {
      cleanAnimeId = cleanAnimeId.replace("anilist-", "consumet-");
    }

    // Normalize raw numeric AniList IDs to consumet- prefix
    if (/^\d+$/.test(cleanAnimeId)) {
      cleanAnimeId = "consumet-" + cleanAnimeId;
    }

    // Prioritize exact match in local catalog first
    try {
      const cleanExternalId = cleanAnimeId.replace(/^(consumet-|hianime-)/, "");
      const localMatch = getAnimesWithEpisodes().find(a => 
        a.id === cleanAnimeId || 
        (a.external_id && a.external_id === cleanExternalId)
      );
      if (localMatch) {
        return localMatch;
      }
    } catch (e) {
      console.warn("Failed to lookup local catalog at getDetails start:", e);
    }

    if (cleanAnimeId.startsWith("consumet-")) {
      const cleanId = cleanAnimeId.replace("consumet-", "");
      
      // Try Consumet REST API first (preferred since it returns Gogo/Zoro stream-compatible episode IDs)
      try {
        const res = await fetch(`${CONSUMET_API_URL}/meta/anilist/info/${cleanId}`, {
          signal: AbortSignal.timeout(1500)
        });
        if (res.ok) {
          const item = await res.json();
          const anime = mapConsumetAnime(item);
          anime.id = cleanAnimeId;
          
          // Map prequel/sequel relations as seasons
          const relations = item.relations || [];
          anime.seasons = relations
            .filter((rel: any) => rel.type === "ANIME" || rel.format === "MOVIE")
            .map((rel: any) => {
              const relTitle = typeof rel.title === "object"
                ? (rel.title.english || rel.title.romaji || rel.title.native || "")
                : (rel.title || "");
              return {
                id: `consumet-${rel.id}`,
                title: relTitle,
                coverUrl: rel.image || rel.cover || anime.coverUrl,
                bannerUrl: rel.cover || rel.image || anime.bannerUrl,
                type: rel.relationType === "MOVIE" || rel.format === "MOVIE" ? "Película" as const : "Anime" as const,
                status: rel.status === "Airing" || rel.status === "Ongoing" || rel.status === "RELEASING" ? "En emisión" as const : "Finalizado" as const,
                year: rel.releaseDate || 2024,
                episodesCount: rel.episodes || 12,
                genres: rel.genres || []
              };
            });

          anime.episodes = (item.episodes || []).map((ep: any) => ({
            id: `consumet-ep-${ep.id}`,
            title: ep.title ? `${anime.title} - ${ep.title}` : `${anime.title} - Episodio ${ep.number}`,
            number: ep.number,
            animeId: cleanAnimeId,
            animeTitle: anime.title,
            coverUrl: ep.image || anime.coverUrl,
            videoUrl: `/api/episode/consumet-ep-${ep.id}`,
            releaseDate: "Hoy"
          }));

          if (anime.status === "En emisión" && anime.episodes.length > 0) {
            anime.episodesCount = anime.episodes.length;
          }

          return anime;
        }
      } catch (err) {
        console.warn(`Consumet REST details fetch failed for ID ${cleanAnimeId}, trying AniList GraphQL:`, err);
      }

      // Try public AniList GraphQL API as secondary fallback
      const anilistId = parseInt(cleanId, 10);
      if (!isNaN(anilistId)) {
        try {
          const data = await queryAniListGraphQL({ id: anilistId });
          if (data && data.Page && data.Page.media && data.Page.media[0]) {
            const media = data.Page.media[0];
            const anime = mapAniListGraphQLMedia(media);
            anime.id = cleanAnimeId;
            anime.episodes = Array.from({ length: anime.episodesCount }, (_, i) => {
              const num = i + 1;
              return {
                id: `${anime.id}-ep-${num}`,
                title: `${anime.title} - Episodio ${num}`,
                number: num,
                animeId: anime.id,
                animeTitle: anime.title,
                coverUrl: anime.coverUrl,
                videoUrl: `/api/episode/${anime.id}-ep-${num}`,
                releaseDate: "Hoy"
              };
            });
            return anime;
          }
        } catch (err) {
          console.warn(`AniList GraphQL details failed for ID ${cleanAnimeId}:`, err);
        }
      } else {
        // Fallback for textual Consumet IDs (e.g. consumet-daemons-of-the-shadow-realm) using AniList search
        try {
          const searchQuery = cleanId.replace(/-/g, " ");
          const data = await queryAniListGraphQL({ search: searchQuery, perPage: 1 });
          if (data && data.Page && data.Page.media && data.Page.media[0]) {
            const media = data.Page.media[0];
            const anime = mapAniListGraphQLMedia(media);
            anime.id = cleanAnimeId;
            anime.episodes = Array.from({ length: anime.episodesCount }, (_, i) => {
              const num = i + 1;
              return {
                id: `${anime.id}-ep-${num}`,
                title: `${anime.title} - Episodio ${num}`,
                number: num,
                animeId: anime.id,
                animeTitle: anime.title,
                coverUrl: anime.coverUrl,
                videoUrl: `/api/episode/${anime.id}-ep-${num}`,
                releaseDate: "Hoy"
              };
            });
            return anime;
          }
        } catch (err) {
          console.warn(`AniList GraphQL details search failed for textual ID ${cleanAnimeId}:`, err);
        }
      }
    }

    if (cleanAnimeId.startsWith("hianime-")) {
      try {
        const cleanId = cleanAnimeId.replace("hianime-", "");
        const infoRes = await fetch(`${HIANIME_API_URL}/api/v1/anime/info?id=${cleanId}`);
        const epRes = await fetch(`${HIANIME_API_URL}/api/v1/anime/episodes?id=${cleanId}`);
        if (infoRes.ok && epRes.ok) {
          const infoJson = await infoRes.json();
          const epJson = await epRes.json();
          const animeInfo = infoJson.data?.anime?.info;
          const episodesList = epJson.data?.episodes || [];

          const anime = mapHiAnime(animeInfo);
          anime.id = cleanAnimeId;
          anime.episodes = episodesList.map((ep: any) => ({
            id: `hianime-ep-${ep.episodeId}`,
            title: `${anime.title} - Episodio ${ep.number}`,
            number: ep.number,
            animeId: cleanAnimeId,
            animeTitle: anime.title,
            coverUrl: anime.coverUrl,
            videoUrl: `/api/episode/hianime-ep-${ep.episodeId}`,
            releaseDate: "Hoy"
          }));

          if (anime.status === "En emisión" && anime.episodes.length > 0) {
            anime.episodesCount = anime.episodes.length;
          }

          return anime;
        }
      } catch (err) {
        console.warn(`HiAnime details fetch failed for ID ${cleanAnimeId}:`, err);
      }
    }

    // If it's a raw text slug (no provider prefix), try to resolve it via AniList search to enrich metadata & alternative titles
    if (!cleanAnimeId.startsWith("consumet-") && !cleanAnimeId.startsWith("hianime-")) {
      try {
        const searchQuery = cleanAnimeId.replace(/-/g, " ");
        const data = await queryAniListGraphQL({ search: searchQuery, perPage: 1 });
        if (data && data.Page && data.Page.media && data.Page.media[0]) {
          const media = data.Page.media[0];
          const anime = mapAniListGraphQLMedia(media);
          // Keep the original slug ID to maintain route consistency
          anime.id = cleanAnimeId;
          anime.episodes = Array.from({ length: anime.episodesCount }, (_, i) => {
            const num = i + 1;
            return {
              id: `${anime.id}-ep-${num}`,
              title: `${anime.title} - Episodio ${num}`,
              number: num,
              animeId: anime.id,
              animeTitle: anime.title,
              coverUrl: anime.coverUrl,
              videoUrl: `/api/episode/${anime.id}-ep-${num}`,
              releaseDate: "Hoy"
            };
          });
          return anime;
        }
      } catch (err) {
        console.warn(`Failed to resolve raw text slug ${cleanAnimeId} via AniList search:`, err);
      }
    }

    const local = getAnimesWithEpisodes().find(a => a.id === cleanAnimeId);
    if (local) return local;

    // Absolute fallback: generate a mock anime dynamically so the details view NEVER fails
    const title = cleanAnimeId.replace("consumet-", "").replace("hianime-", "").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const cover = "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400";
    return {
      id: cleanAnimeId,
      title: title,
      synopsis: "Explora este anime directamente en megaAnime. La conexión con el proveedor externo de metadatos se encuentra fuera de línea.",
      coverUrl: cover,
      bannerUrl: cover,
      genres: ["Acción", "Aventura", "Fantasía"],
      status: "Finalizado",
      rating: 8.5,
      type: "Anime",
      episodesCount: 12,
      year: 2024,
      episodes: generateMockEpisodesFor(cleanAnimeId, title, cover, false)
    };
  }

  static async getStreamLinks(episodeId: string): Promise<{ name: string; url: string }[]> {
    const servers: { name: string; url: string }[] = [];
    let animeId = episodeId;
    let epNum = 1;
    let isMovie = episodeId.toLowerCase().includes("movie") || episodeId.toLowerCase().includes("pelicula");
    let matchedAnimeTitle = "";

    const isConsumet = episodeId.startsWith("consumet-ep-") || (episodeId.startsWith("consumet-") && episodeId.includes("-ep-"));
    if (isConsumet) {
      let cleanId = episodeId;
      if (episodeId.startsWith("consumet-ep-")) {
        cleanId = episodeId.replace("consumet-ep-", "");
      } else {
        cleanId = episodeId.replace("consumet-", "");
      }
      try {
        const res = await fetch(`${CONSUMET_API_URL}/meta/anilist/watch/${cleanId}`, {
          signal: AbortSignal.timeout(1500)
        });
        if (res.ok) {
          const data = await res.json();
          const sources = data.sources || [];
          sources.forEach((src: any, idx: number) => {
            servers.push({
              name: `Consumet HLS ${src.quality || idx}`,
              url: src.url
            });
          });
        }
      } catch (e) {
        console.warn("Consumet watch stream failed:", e);
      }
    }

    if (episodeId.startsWith("hianime-ep-")) {
      const cleanId = episodeId.replace("hianime-ep-", "");
      try {
        const res = await fetch(`${HIANIME_API_URL}/api/v1/anime/episode-srcs?id=${cleanId}`, {
          signal: AbortSignal.timeout(1500)
        });
        if (res.ok) {
          const data = await res.json();
          const sources = data.data?.sources || [];
          sources.forEach((src: any, idx: number) => {
            servers.push({
              name: `HiAnime Direct ${idx + 1}`,
              url: src.url
            });
          });
        }
      } catch (e) {
        console.warn("HiAnime stream resolution failed:", e);
      }
    }

    try {
      const res = await fetch(`${DST3V3_API_URL}/anime/watch/${episodeId}`, {
        signal: AbortSignal.timeout(1500)
      });
      if (res.ok) {
        const data = await res.json();
        const sources = data.sources || [];
        sources.forEach((src: any) => {
          servers.push({
            name: `AnimeFlv Go Stream`,
            url: src.url
          });
        });
      }
    } catch (e) {}

    // Fallback: if no streaming servers resolved, run local website scrapers directly!
    if (servers.length === 0) {
      try {
        console.log(`Aggregator offline, launching local scraper fallback for episode ${episodeId}...`);
        
        // Find clean animeId and episode number
        animeId = episodeId;
        epNum = 1;
        isMovie = episodeId.toLowerCase().includes("movie") || episodeId.toLowerCase().includes("pelicula");
        matchedAnimeTitle = "";

        // Try local DB lookup first to map accurately
        const localAnimes = getAnimesWithEpisodes();
        let foundLocal = false;
        
        // 1. Try finding exact episode ID match
        for (const a of localAnimes) {
          const ep = a.episodes?.find(e => e.id === episodeId);
          if (ep) {
            animeId = a.id;
            epNum = ep.number;
            isMovie = a.type === "Película";
            matchedAnimeTitle = a.title;
            foundLocal = true;
            break;
          }
        }

        // 2. Robust episodeId parsing for local fallback matching
        let parsedTitle = animeId.replace("consumet-", "").replace("hianime-", "").replace(/-/g, " ");
        if (!foundLocal) {
          // Prioritize explicit episode tags over generic hyphens to avoid wrong cuts (e.g. matching -9 instead of -ep-9)
          const epMatch = episodeId.match(/(?:-ep-|-e-|-episodio-|-capitulo-|-cap-|_)(?:s\d+)?(\d+)$/i) || episodeId.match(/-(\d+)$/i);
          if (epMatch) {
            epNum = parseInt(epMatch[1], 10) || 1;
            
            // Extract and clean raw anime ID
            const matchIndex = episodeId.lastIndexOf(epMatch[0]);
            let rawAnimeId = matchIndex !== -1 ? episodeId.substring(0, matchIndex) : episodeId;
            
            // Strip leading API provider prefixes and trailing episode suffixes
            let cleanAnimeId = rawAnimeId.replace(/^(consumet-ep-|hianime-ep-|consumet-|hianime-)/i, "");
            cleanAnimeId = cleanAnimeId.replace(/-(?:episode|episodio|capitulo|cap|ep)$/i, "");
            
            animeId = cleanAnimeId;
            parsedTitle = cleanAnimeId.replace(/-/g, " ");
          } else {
            // Ultimate fallback in case no trailing number is matched
            const cleanAnimeId = episodeId.replace(/^(consumet-ep-|hianime-ep-|consumet-|hianime-)/i, "");
            animeId = cleanAnimeId;
            parsedTitle = cleanAnimeId.replace(/-/g, " ");
            epNum = 1;
          }

          // Match by external_id if clean ID is numeric or starts with digits (e.g. "21" -> "one-piece")
          const cleanExternalId = animeId.replace(/^(consumet-|hianime-)/, "");
          const matchByExtId = localAnimes.find(a => a.external_id && a.external_id === cleanExternalId);
          if (matchByExtId) {
            animeId = matchByExtId.id;
            isMovie = matchByExtId.type === "Película";
            matchedAnimeTitle = matchByExtId.title;
            foundLocal = true;
          }

          // 3. Cross-reference search & Fuzzy matching (Confidence Threshold >= 85%)
          let bestMatch: any = null;
          let highestScore = 0;
          
          for (const a of localAnimes) {
            const targets = [a.title, a.title_romaji, a.title_english].filter(Boolean) as string[];
            for (const target of targets) {
              const score = fuzzyMatch(parsedTitle, target);
              if (score > highestScore) {
                highestScore = score;
                bestMatch = a;
              }
            }
          }

          if (highestScore >= 0.85 && bestMatch) {
            animeId = bestMatch.id;
            isMovie = bestMatch.type === "Película";
            matchedAnimeTitle = bestMatch.title;
            foundLocal = true;
          }
        }

        // 4. Fetch details to get all alternative titles (Romaji, English, etc.) for accurate matching
        let alTitles: any = null;
        try {
          const lookupId = animeId.startsWith("consumet-") || animeId.startsWith("hianime-") 
            ? animeId 
            : /^\d+$/.test(animeId) 
              ? `consumet-${animeId}` 
              : animeId;
          
          console.log(`Hot path lookup details for: ${lookupId}`);
          const details = await AnimeApiAggregator.getDetails(lookupId);
          if (details) {
            if (!matchedAnimeTitle || matchedAnimeTitle === animeId) {
              matchedAnimeTitle = details.title;
            }
            alTitles = {
              romaji: details.title_romaji,
              english: details.title_english,
              native: details.title_native
            };
          }
        } catch (e) {
          console.warn("Hot path title retrieval failed:", e);
        }

        if (!matchedAnimeTitle) {
          matchedAnimeTitle = parsedTitle;
        }

        // Run both scrapers in parallel for faster resolution
        const [mcResult, flvResult] = await Promise.allSettled([
          scrapeEpisodeFromMonosChinos(
            episodeId,
            animeId,
            epNum,
            isMovie,
            matchedAnimeTitle,
            alTitles
          ),
          scrapeEpisodeFromAnimeFLV(
            episodeId,
            animeId,
            epNum,
            isMovie,
            matchedAnimeTitle,
            alTitles
          )
        ]);

        // Prioritize MonosChinos results first, and then AnimeFLV, but DO NOT discard AnimeFLV
        // if MonosChinos has servers. Instead, merge both so the user has alternative working players.
        if (mcResult.status === "fulfilled" && mcResult.value && mcResult.value.length > 0) {
          servers.push(...mcResult.value);
        }
        if (flvResult.status === "fulfilled" && flvResult.value && flvResult.value.length > 0) {
          servers.push(...flvResult.value);
        }
      } catch (err) {
        console.error("Local scraper fallbacks failed:", err);
      }
    }

    // If no direct anime video streams were resolved, inject dynamic YouTube and Trailer fallbacks
    if (servers.length === 0) {
      console.log(`Stream resolution returned empty. Injecting dynamic YouTube/Trailer servers for: ${matchedAnimeTitle || animeId}`);
      
      const searchTitle = matchedAnimeTitle || animeId.replace(/-/g, " ");
      if (searchTitle && searchTitle !== "undefined") {
        // 1. YouTube Live Search Player for the episode
        const queryTerm = isMovie 
          ? `${searchTitle} pelicula completa sub español` 
          : `${searchTitle} episodio ${epNum} sub español`;
        
        servers.push({
          name: "YouTube Búsqueda Directa",
          url: `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(queryTerm)}`
        });

        // 2. Fetch the official trailer from AniList details if available
        try {
          const details = await AnimeApiAggregator.getDetails(animeId);
          const detailsAny = details as any;
          if (detailsAny?.trailer?.site === "youtube" && detailsAny.trailer.id) {
            servers.push({
              name: "Tráiler Oficial (YouTube)",
              url: `https://www.youtube.com/embed/${detailsAny.trailer.id}`
            });
          }
        } catch (e) {
          // ignore
        }
      }
    }

    // Ultimate fallback mockups (Big Buck Bunny) ONLY when servers count is absolutely zero
    if (servers.length === 0) {
      servers.push(
        { name: "MegaServer Directo (Prueba)", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" },
        { name: "MegaServer Respaldo (Prueba)", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" }
      );
    }

    return servers;
  }
}

// Public AniList GraphQL Client and Mapper
export async function queryAniListGraphQL(variables: any): Promise<any> {
  const query = `
    query ($id: Int, $page: Int, $perPage: Int, $status: MediaStatus, $format: MediaFormat, $search: String, $genre: String, $tag: String) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          hasNextPage
        }
        media(id: $id, search: $search, type: ANIME, status: $status, format: $format, genre: $genre, tag: $tag, sort: [TRENDING_DESC, POPULARITY_DESC]) {
          id
          title {
            romaji
            english
            native
          }
          description
          coverImage {
            large
            extraLarge
          }
          bannerImage
          genres
          status
          format
          averageScore
          seasonYear
          episodes
          nextAiringEpisode {
            episode
          }
          relations {
            edges {
              relationType
              node {
                id
                title {
                  romaji
                  english
                }
                type
                format
                status
                coverImage {
                  large
                }
                bannerImage
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        query,
        variables
      }),
      signal: AbortSignal.timeout(6000)
    });

    if (response.ok) {
      const json = await response.json();
      return json.data;
    }
  } catch (err) {
    console.error("AniList GraphQL API call failed:", err);
  }
  return null;
}

export function mapAniListGraphQLMedia(media: any): Anime {
  const title = media.title.english || media.title.romaji || media.title.native || "Anime Sin Título";
  const coverUrl = media.coverImage.large || media.coverImage.extraLarge || "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400";
  const bannerUrl = media.bannerImage || coverUrl;
  const status = media.status === "RELEASING" ? "En emisión" : "Finalizado";
  const type = media.format === "MOVIE" ? "Película" : "Anime";
  
  // Clean synopsis tags
  let synopsis = media.description || "Sin descripción disponible.";
  synopsis = synopsis.replace(/<[^>]*>/g, ""); // Remove HTML tags like <br>, <i>, etc.

  // Map relations to seasons
  const seasons: Anime[] = [];
  if (media.relations && media.relations.edges) {
    media.relations.edges.forEach((edge: any) => {
      const node = edge.node;
      if (node.type === "ANIME" || node.format === "MOVIE") {
        const relTitle = node.title.english || node.title.romaji || "Relacionado";
        const relCover = node.coverImage?.large || coverUrl;
        seasons.push({
          id: `consumet-${node.id}`,
          title: relTitle,
          synopsis: "Sin sinopsis disponible.",
          coverUrl: relCover,
          bannerUrl: node.bannerImage || relCover,
          type: node.format === "MOVIE" ? "Película" as const : "Anime" as const,
          status: node.status === "RELEASING" ? "En emisión" as const : "Finalizado" as const,
          year: node.seasonYear || 2024,
          episodesCount: node.episodes || 12,
          rating: 8.0,
          genres: [],
          episodes: []
        });
      }
    });
  }

  let episodesCount = media.episodes || 12;
  if (status === "En emisión") {
    const nextEp = media.nextAiringEpisode?.episode;
    if (nextEp !== undefined && nextEp !== null) {
      episodesCount = Math.max(1, nextEp - 1);
    }
  }

  return {
    id: `consumet-${media.id}`,
    title,
    synopsis,
    coverUrl,
    bannerUrl,
    genres: (media.genres || []).map((g: string) => translateGenre(g)),
    status,
    rating: media.averageScore ? Number((media.averageScore / 10).toFixed(1)) : 8.0,
    type,
    episodesCount,
    year: media.seasonYear || 2024,
    episodes: [],
    seasons,
    title_english: media.title?.english,
    title_romaji: media.title?.romaji,
    title_native: media.title?.native
  };
}

