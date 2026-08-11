import fs from "fs";
import path from "path";
import { getAnimesWithEpisodes } from "./animeDb";

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
  const epText = item.isMovie ? "¡PELÍCULA ESTRENO!" : `Capítulo ${item.episodeNumber}`;
  const genresText = item.genres && item.genres.length > 0 ? item.genres.slice(0, 3).join(", ") : "Anime";
  const hashtagAnime = item.animeTitle.replace(/[^a-zA-Z0-9]/g, "");

  const cleanWebUrl = "https://megaanime.net";

  return `🔥 ¡NUEVO ESTRENO DISPONIBLE EN megaAnime! 🔥

🎬 Anime: ${item.animeTitle}
📺 ${epText}
⭐ Géneros: ${genresText}

🍿 ¡Disfrútalo ahora mismo en FULL HD, sin anuncios molestos y con la mejor velocidad de reproducción!

🌐 Ver en la Web:
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

  const caption = generateFacebookPostCaption({
    animeTitle: payload.animeTitle,
    episodeNumber: payload.episodeNumber,
    genres: payload.genres,
    isMovie: payload.isMovie,
    webUrl: domain
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

    // Secondary fallback: lookup anime by exact title or ID in catalog if initial blob fetch failed
    if (!imgBlob) {
      const catalog = getAnimesWithEpisodes();
      const item = catalog.find(a => a.title.toLowerCase() === payload.animeTitle.toLowerCase())
        || catalog.find(a => a.id === payload.animeId)
        || catalog.find(a => a.title.toLowerCase().startsWith(payload.animeTitle.toLowerCase()));

      if (item && item.coverUrl && item.coverUrl.startsWith("http")) {
        try {
          const fallbackRes = await fetch(item.coverUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
            signal: AbortSignal.timeout(8000)
          });
          if (fallbackRes.ok && (fallbackRes.headers.get("content-type") || "").includes("image/")) {
            imgBlob = await fallbackRes.blob();
          }
        } catch (e) {}
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
    }

    // Fallback: Feed post with link if photo binary was unavailable
    if (!postId) {
      console.log(`[FB Auto-Post] Photo binary unavailable, publishing feed link post to Facebook Page...`);
      const feedUrl = `https://graph.facebook.com/v19.0/${pageId}/feed`;
      const feedRes = await fetch(feedUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: caption,
          link: domain,
          access_token: pageToken
        })
      });

      const feedData = await feedRes.json();
      if (feedRes.ok && (feedData.id || feedData.post_id)) {
        postId = feedData.id || feedData.post_id;
        savePostedId(payload.episodeId);
        console.log(`[FB Auto-Post] 🎉 Publicación de enlace exitosa en Facebook! Post ID: ${postId}`);
      } else {
        const errorMsg = feedData.error?.message || JSON.stringify(feedData);
        return { success: false, error: errorMsg };
      }
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

import cron from "node-cron";

/**
 * Initializes a 3-hour cron schedule that automatically selects a random UNPUBLISHED anime from the catalog
 * and publishes it with high-res cover image to Facebook Page MegaAnime without ever repeating.
 */
export function startPeriodicFacebookAutoPoster() {
  console.log("[FB Periodic Poster] 🤖 Initializing 3-hour non-repeating Facebook publication scheduler...");

  const publishRandomAnime = async () => {
    try {
      const catalog = getAnimesWithEpisodes();
      if (!catalog || catalog.length === 0) return;

      const postedSet = getPostedSet();

      // Filter catalog to exclude any anime that has already been posted to Facebook
      let unpostedAnimes = catalog.filter(a => {
        const idKey = a.id;
        const titleKey = a.title.toLowerCase();
        return !postedSet.has(idKey) && !postedSet.has(titleKey) && !postedSet.has(`periodic-${a.id}`);
      });

      // If all catalog items have been published, log and cycle safely
      if (unpostedAnimes.length === 0) {
        console.log("[FB Periodic Poster] ℹ️ All catalog titles have been posted once. Resetting loop for fresh cycle...");
        unpostedAnimes = catalog;
      }

      const randomIndex = Math.floor(Math.random() * unpostedAnimes.length);
      const selectedAnime = unpostedAnimes[randomIndex];

      console.log(`[FB Periodic Poster] ⏰ 3-Hour Cron Triggered (Unique): Publishing "${selectedAnime.title}" (ID: ${selectedAnime.id}). (${unpostedAnimes.length} unposted items remaining)...`);

      // Save ID and normalized title in postedSet to guarantee zero repetitions
      savePostedId(selectedAnime.id);
      savePostedId(selectedAnime.title.toLowerCase());
      savePostedId(`periodic-${selectedAnime.id}`);

      const payload: FacebookPostPayload = {
        episodeId: `periodic-${selectedAnime.id}-${Date.now()}`,
        animeId: selectedAnime.id,
        animeTitle: selectedAnime.title,
        episodeNumber: selectedAnime.episodesCount || 12,
        coverUrl: selectedAnime.coverUrl || selectedAnime.cover || "",
        genres: selectedAnime.genres,
        isMovie: selectedAnime.type === "Película"
      };

      await postNewReleaseToFacebook(payload);
    } catch (e) {
      console.error("[FB Periodic Poster] Error publishing non-repeating random anime to Facebook:", e);
    }
  };

  // Schedule task every 3 hours: "0 */3 * * *"
  cron.schedule("0 */3 * * *", publishRandomAnime);

  // Trigger initial publication immediately on startup
  setTimeout(() => {
    publishRandomAnime().catch(console.error);
  }, 10000);
}
