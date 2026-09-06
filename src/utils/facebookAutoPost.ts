import fs from "fs";
import path from "path";
import { getAnimesWithEpisodes } from "./animeDb";

const LAST_POST_FILE = path.join(process.cwd(), "src/utils/facebook_last_post.json");
const THREE_HOURS_MS = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

function getLastPostTime(): number {
  try {
    if (fs.existsSync(LAST_POST_FILE)) {
      const raw = fs.readFileSync(LAST_POST_FILE, "utf-8");
      const data = JSON.parse(raw);
      return data.lastPostTime || 0;
    }
  } catch (e) {}
  return 0;
}

function saveLastPostTime() {
  try {
    fs.writeFileSync(LAST_POST_FILE, JSON.stringify({ lastPostTime: Date.now() }), "utf-8");
  } catch (e) {
    console.error("Error writing facebook_last_post.json:", e);
  }
}

export interface FacebookPostPayload {
  episodeId: string;
  animeId: string;
  animeTitle: string;
  episodeNumber: number;
  coverUrl: string;
  genres?: string[];
  isMovie?: boolean;
}

const POSTED_FILE = path.join(process.cwd(), "src/utils/facebook_posted.json");

function getPostedSet(): Set<string> {
  try {
    if (fs.existsSync(POSTED_FILE)) {
      const raw = fs.readFileSync(POSTED_FILE, "utf-8");
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return new Set(list);
    }
  } catch (e) {
    console.error("Error reading facebook_posted.json:", e);
  }
  return new Set();
}

function savePostedId(episodeId: string) {
  try {
    const postedSet = getPostedSet();
    postedSet.add(episodeId);
    const parentDir = path.dirname(POSTED_FILE);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(POSTED_FILE, JSON.stringify(Array.from(postedSet), null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing facebook_posted.json:", e);
  }
}

/**
 * Formats an engaging, high-converting Facebook post in Spanish with hashtags and direct web link only.
 * Mobile app line removed per user preference for now.
 */
export function generateFacebookPostCaption(item: {
  animeTitle: string;
  episodeNumber: number;
  genres?: string[];
  isMovie?: boolean;
  webUrl: string;
}): string {
  const epText = item.isMovie ? "¡PELÍCULA ESTRENO!" : (item.episodeNumber > 0 ? `Capítulo ${item.episodeNumber}` : "Temporada Completa");
  const genresText = item.genres && item.genres.length > 0 ? item.genres.slice(0, 3).join(", ") : "Anime";
  const hashtagAnime = item.animeTitle.replace(/[^a-zA-Z0-9]/g, "");

  const cleanWebUrl = item.webUrl || "https://megaanime-1c250.web.app";

  return `🔥 ¡YA DISPONIBLE EN megaAnime SIN ANUNCIOS! 🔥

🎬 Anime: ${item.animeTitle}
📺 ${epText}
⭐ Géneros: ${genresText}
⚡ Servidor Exclusivo MegaAnime (1080p Ultra HD)

🍿 ¡Disfrútalo ahora mismo en FULL HD nativo, sin anuncios molestos y con la máxima velocidad de streaming!

🌐 Ver Directo Aquí:
${cleanWebUrl}

#megaAnime #AnimeEnEspañol #${hashtagAnime} #EstrenoAnime #Otaku #AnimeHD`;
}

/**
 * Posts a new release photo + text directly to the official Facebook Page (and linked Groups) via Meta Graph API.
 */
export async function postNewReleaseToFacebook(
  payload: FacebookPostPayload
): Promise<{ success: boolean; postId?: string; error?: string }> {
  const pageId = process.env.FACEBOOK_PAGE_ID || "1375353446122077";
  const pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || "EAAPY6fJZB22ABSCkBRNDTaALhaLA5xUKDOW02qfT6q838T0mjwk7LZCOyZC4d1jYoAhV7ZCist1lVVpdlWGBbu15L4P9YZCki9D4UYZAFYlG6y5eHo6NDBdvHFxHx6D9IgDdUkcBthE8srQtv9b3W1aRHjtWIZAX7IHEo9CxdEeHMBpQWIacZAyBDNBekI7jttTjDo8U";
  const domain = "https://megaanime.net";

  if (!pageId || !pageToken) {
    console.log(`[FB Auto-Post] Skipped for "${payload.animeTitle}" Ep ${payload.episodeNumber} (FACEBOOK_PAGE_ID or FACEBOOK_PAGE_ACCESS_TOKEN missing in .env)`);
    return {
      success: false,
      error: "FACEBOOK_PAGE_ID o FACEBOOK_PAGE_ACCESS_TOKEN no están configurados en el archivo .env"
    };
  }

  // Prevent duplicate posts
  const postedSet = getPostedSet();
  if (postedSet.has(payload.episodeId)) {
    console.log(`[FB Auto-Post] Episode ${payload.episodeId} already posted to Facebook.`);
    return { success: false, error: "Este episodio ya fue publicado en Facebook previamente." };
  }

  // Look up actual anime item in catalog if coverUrl is missing or invalid
  let targetCoverUrl = payload.coverUrl;
  if (!targetCoverUrl || targetCoverUrl.length < 10 || !targetCoverUrl.startsWith("http")) {
    const catalog = getAnimesWithEpisodes();
    const item = catalog.find(a => a.id === payload.animeId || a.title.toLowerCase() === payload.animeTitle.toLowerCase());
    if (item && item.coverUrl) {
      targetCoverUrl = item.coverUrl;
    }
  }

  const cleanSlug = payload.animeTitle
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const directAnimeUrl = `https://megaanime.net/ver/${cleanSlug}`;

  const caption = generateFacebookPostCaption({
    animeTitle: payload.animeTitle,
    episodeNumber: payload.episodeNumber,
    genres: payload.genres,
    isMovie: payload.isMovie,
    webUrl: directAnimeUrl
  });

  try {
    console.log(`[FB Auto-Post] 📤 Publishing cover photo post to Facebook Page (${pageId}) for "${payload.animeTitle}"...`);
    
    // Fetch image binary blob to ensure direct HD photo attachment on Meta Graph API
    let imgBlob: Blob | null = null;
    if (targetCoverUrl && targetCoverUrl.startsWith("http")) {
      try {
        const imgRes = await fetch(targetCoverUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          },
          signal: AbortSignal.timeout(8000)
        });
        if (imgRes.ok) {
          const contentType = imgRes.headers.get("content-type") || "";
          if (contentType.includes("image/")) {
            imgBlob = await imgRes.blob();
          }
        }
      } catch (e) {
        console.warn(`[FB Auto-Post] Failed to fetch cover image from ${targetCoverUrl}:`, e);
      }
    }

    // Tertiary fallback: query AniList for high-res cover image URL to guarantee 100% visible photo posts
    if (!imgBlob) {
      try {
        console.log(`[FB Auto-Post] 🔍 Fetching AniList HD cover for "${payload.animeTitle}"...`);
        const query = `
          query ($search: String) {
            Media(search: $search, type: ANIME) {
              coverImage { extraLarge large }
            }
          }
        `;
        const aniRes = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, variables: { search: payload.animeTitle } })
        });
        if (aniRes.ok) {
          const aniData = await aniRes.json();
          const aniCover = aniData?.data?.Media?.coverImage?.extraLarge || aniData?.data?.Media?.coverImage?.large;
          if (aniCover && aniCover.startsWith("http")) {
            const aniImgRes = await fetch(aniCover, { signal: AbortSignal.timeout(8000) });
            if (aniImgRes.ok) {
              imgBlob = await aniImgRes.blob();
            }
          }
        }
      } catch (e) {
        console.warn(`[FB Auto-Post] AniList fallback failed for ${payload.animeTitle}:`, e);
      }
    }

    let postId: string | undefined;

    if (imgBlob && imgBlob.size > 500) {
      const formData = new FormData();
      formData.append("source", imgBlob, "cover.jpg");
      formData.append("caption", caption);
      formData.append("access_token", pageToken);

      const fbUrl = `https://graph.facebook.com/v19.0/${pageId}/photos`;
      const response = await fetch(fbUrl, {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      if (response.ok && (data.id || data.post_id)) {
        postId = data.id || data.post_id;
        savePostedId(payload.episodeId);
        console.log(`[FB Auto-Post] 🎉 Publicación de foto exitosa en Facebook! Post ID: ${postId}`);
      }
    } else if (targetCoverUrl && targetCoverUrl.startsWith("http")) {
      const formData = new FormData();
      formData.append("url", targetCoverUrl);
      formData.append("caption", caption);
      formData.append("access_token", pageToken);

      const fbUrl = `https://graph.facebook.com/v19.0/${pageId}/photos`;
      const response = await fetch(fbUrl, {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      if (response.ok && (data.id || data.post_id)) {
        postId = data.id || data.post_id;
        savePostedId(payload.episodeId);
        console.log(`[FB Auto-Post] 🎉 Publicación de foto exitosa en Facebook via URL! Post ID: ${postId}`);
      }
    } else {
      // Feed text post fallback
      const response = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: caption,
          link: directAnimeUrl,
          access_token: pageToken
        })
      });
      const data = await response.json();
      if (response.ok && (data.id || data.post_id)) {
        postId = data.id || data.post_id;
        savePostedId(payload.episodeId);
        console.log(`[FB Auto-Post] 🎉 Publicación de feed exitosa en Facebook! Post ID: ${postId}`);
      }
    }

    if (!postId) {
      console.warn(`[FB Auto-Post] ⚠️ Skipping Facebook post for "${payload.animeTitle}".`);
      return { success: false, error: "No se pudo completar la publicación en Facebook." };
    }

    // Optional: Auto-share to Facebook Groups configured in FACEBOOK_GROUP_IDS
    const groupIdsRaw = process.env.FACEBOOK_GROUP_IDS || "";
    if (groupIdsRaw.trim().length > 0) {
      const groupIds = groupIdsRaw.split(",").map(g => g.trim()).filter(Boolean);
      for (const groupId of groupIds) {
        try {
          console.log(`[FB Auto-Post] 📢 Cross-posting to Facebook Group ID: ${groupId}...`);
          await fetch(`https://graph.facebook.com/v19.0/${groupId}/feed`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: caption,
              link: domain,
              access_token: pageToken
            })
          });
        } catch (gErr) {
          console.warn(`[FB Auto-Post] Failed to cross-post to group ${groupId}:`, gErr);
        }
      }
    }

    return { success: true, postId };
  } catch (err: any) {
    console.error(`[FB Auto-Post] ❌ Excepción de red al publicar en Facebook:`, err.message || err);
    return { success: false, error: err.message || "Error de red al conectar con Facebook" };
  }
}

/**
 * Publishes a random unpublished anime to Facebook IF at least 3 hours have passed since the last post.
 * Must be called from a scheduled endpoint — NOT on server startup.
 * Returns { posted: true } if published, { posted: false, reason } if skipped.
 */
export async function publishRandomAnimeIfDue(): Promise<{ posted: boolean; reason?: string; animeTitle?: string }> {
  const lastPostTime = getLastPostTime();
  const now = Date.now();
  const elapsed = now - lastPostTime;

  if (lastPostTime > 0 && elapsed < THREE_HOURS_MS) {
    const minutesLeft = Math.ceil((THREE_HOURS_MS - elapsed) / 60000);
    const msg = `Próxima publicación en ${minutesLeft} minuto(s). Última publicación hace ${Math.floor(elapsed / 60000)} minutos.`;
    console.log(`[FB Periodic Poster] ⏳ Skipping — ${msg}`);
    return { posted: false, reason: msg };
  }

  try {
    const catalog = getAnimesWithEpisodes();
    if (!catalog || catalog.length === 0) return { posted: false, reason: "Catálogo vacío" };

    const postedSet = getPostedSet();

    let unpostedAnimes = catalog.filter(a => {
      return !postedSet.has(a.id) && !postedSet.has(a.title.toLowerCase()) && !postedSet.has(`periodic-${a.id}`);
    });

    if (unpostedAnimes.length === 0) {
      console.log("[FB Periodic Poster] ℹ️ All catalog titles posted. Resetting loop...");
      unpostedAnimes = catalog;
    }

    const selectedAnime = unpostedAnimes[Math.floor(Math.random() * unpostedAnimes.length)];

    console.log(`[FB Periodic Poster] 🎬 Publishing "${selectedAnime.title}" (${unpostedAnimes.length} remaining)...`);

    savePostedId(selectedAnime.id);
    savePostedId(selectedAnime.title.toLowerCase());
    savePostedId(`periodic-${selectedAnime.id}`);
    saveLastPostTime();

    const payload: FacebookPostPayload = {
      episodeId: `periodic-${selectedAnime.id}-${Date.now()}`,
      animeId: selectedAnime.id,
      animeTitle: selectedAnime.title,
      episodeNumber: selectedAnime.episodesCount || 12,
      coverUrl: selectedAnime.coverUrl || "",
      genres: selectedAnime.genres,
      isMovie: selectedAnime.type === "Película"
    };

    await postNewReleaseToFacebook(payload);
    return { posted: true, animeTitle: selectedAnime.title };
  } catch (e: any) {
    console.error("[FB Periodic Poster] Error:", e);
    return { posted: false, reason: e.message };
  }
}

/** @deprecated Use publishRandomAnimeIfDue() via endpoint instead. Left for reference. */
export function startPeriodicFacebookAutoPoster() {
  console.log("[FB Periodic Poster] 🤖 Auto-poster initialized (timestamp-guarded, cron-free).");
}
