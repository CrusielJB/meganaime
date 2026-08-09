import fs from "fs";
import path from "path";

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
 * Formats an engaging, high-converting Facebook post in Spanish with hashtags and direct links.
 */
export function generateFacebookPostCaption(item: {
  animeTitle: string;
  episodeNumber: number;
  genres?: string[];
  isMovie?: boolean;
  webUrl: string;
  androidUrl: string;
}): string {
  const epText = item.isMovie ? "¡PELÍCULA ESTRENO!" : `Capítulo ${item.episodeNumber}`;
  const genresText = item.genres && item.genres.length > 0 ? item.genres.slice(0, 3).join(", ") : "Anime";
  const hashtagAnime = item.animeTitle.replace(/[^a-zA-Z0-9]/g, "");

  return `🔥 ¡NUEVO ESTRENO DISPONIBLE EN megaAnime! 🔥

🎬 Anime: ${item.animeTitle}
📺 ${epText}
⭐ Géneros: ${genresText}

🍿 ¡Disfrútalo ahora mismo en FULL HD, sin anuncios molestos y con la mejor velocidad de reproducción!

🌐 Ver en la Web:
${item.webUrl}

📱 Descargar App para Android:
${item.androidUrl}

#megaAnime #AnimeEnEspañol #${hashtagAnime} #EstrenoAnime #Otaku #AnimeHD`;
}

/**
 * Posts a new release photo + text directly to the official Facebook Page via Meta Graph API.
 */
export async function postNewReleaseToFacebook(
  payload: FacebookPostPayload
): Promise<{ success: boolean; postId?: string; error?: string }> {
  const pageId = process.env.FACEBOOK_PAGE_ID || "1375353446122077";
  const pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || "EAAPY6fJZB22ABSCkBRNDTaALhaLA5xUKDOW02qfT6q838T0mjwk7LZCOyZC4d1jYoAhV7ZCist1lVVpdlWGBbu15L4P9YZCki9D4UYZAFYlG6y5eHo6NDBdvHFxHx6D9IgDdUkcBthE8srQtv9b3W1aRHjtWIZAX7IHEo9CxdEeHMBpQWIacZAyBDNBekI7jttTjDo8U";
  const domain = process.env.WEB_APP_URL || "https://megaanime.net";
  const androidUrl = process.env.ANDROID_APP_URL || `${domain}/download/android`;

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

  // Prepare full cover image URL
  let fullCoverUrl = payload.coverUrl || "https://cdn.myanimelist.net/images/anime/4/19644.jpg";
  if (!fullCoverUrl.startsWith("http")) {
    fullCoverUrl = `${domain}${fullCoverUrl.startsWith("/") ? "" : "/"}${fullCoverUrl}`;
  }

  const webUrl = `${domain}?anime=${encodeURIComponent(payload.animeId)}&ep=${encodeURIComponent(payload.episodeId)}`;
  const caption = generateFacebookPostCaption({
    animeTitle: payload.animeTitle,
    episodeNumber: payload.episodeNumber,
    genres: payload.genres,
    isMovie: payload.isMovie,
    webUrl,
    androidUrl
  });

  try {
    console.log(`[FB Auto-Post] 📤 Publishing cover photo post to Facebook Page (${pageId}) for "${payload.animeTitle}"...`);
    
    // Fetch image binary blob to ensure direct HD photo attachment on Meta Graph API
    let imgBlob: Blob | null = null;
    try {
      const imgRes = await fetch(fullCoverUrl, { signal: AbortSignal.timeout(6000) });
      if (imgRes.ok) {
        imgBlob = await imgRes.blob();
      }
    } catch (e) {
      console.warn(`[FB Auto-Post] Failed to fetch image binary from ${fullCoverUrl}, trying fallback URL...`);
    }

    if (!imgBlob) {
      const fallbackRes = await fetch("https://cdn.myanimelist.net/images/anime/4/19644.jpg");
      imgBlob = await fallbackRes.blob();
    }

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
      const postId = data.id || data.post_id;
      savePostedId(payload.episodeId);
      console.log(`[FB Auto-Post] 🎉 Publicación exitosa en Facebook! Post ID: ${postId}`);
      return { success: true, postId };
    } else {
      const errorMsg = data.error?.message || JSON.stringify(data);
      console.error(`[FB Auto-Post] ❌ Error de Facebook Graph API:`, errorMsg);
      return { success: false, error: errorMsg };
    }
  } catch (err: any) {
    console.error(`[FB Auto-Post] ❌ Excepción de red al publicar en Facebook:`, err.message || err);
    return { success: false, error: err.message || "Error de red al conectar con Facebook" };
  }
}
