const dotenv = require("dotenv");
dotenv.config();

const pageId = process.env.FACEBOOK_PAGE_ID || "1375353446122077";
const pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

if (!pageId || !pageToken) {
  console.error("❌ Faltan credenciales de Facebook en .env");
  process.exit(1);
}

// STRICT REQUIREMENT: megaanime.net is down, strictly use the live Firebase web app domain
const BASE_URL = "https://megaanime-1c250.web.app";

// STRICT REQUIREMENT: Clean URLs, no scraper names (no tioanime, monoschinos, etc.)
const airingEpisodesToPublish = [
  {
    title: "One Piece",
    episodeNumber: 1176,
    epText: "Capítulo 1176 (Arco de Egghead)",
    slug: "one-piece",
    genres: ["Acción", "Aventura", "Fantasía", "Shounen"],
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21-YCDoj1EkAxFn.jpg"
  },
  {
    title: "Mushoku Tensei: Jobless Reincarnation - Temporada 3",
    episodeNumber: 10,
    epText: "Capítulo 10 (Nuevo Estreno)",
    slug: "mushoku-tensei-3",
    genres: ["Aventura", "Drama", "Fantasía", "Isekai"],
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx108465-1ANspF1EWyFx.jpg"
  },
  {
    title: "Bleach: Thousand-Year Blood War - Parte 4",
    episodeNumber: 46,
    epText: "Capítulo 46 (El Conflicto)",
    slug: "bleach-sennen-kessen-hen",
    genres: ["Acción", "Aventura", "Sobrenatural", "Shounen"],
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx185874-aU3e6tBT6wwA.jpg"
  },
  {
    title: "Dandadan",
    episodeNumber: 12,
    epText: "Capítulo 12 (Final de Temporada)",
    slug: "dandadan",
    genres: ["Acción", "Comedia", "Sobrenatural", "Ciencia Ficción"],
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx171018-60q1B6GK2Ghb.jpg"
  },
  {
    title: "That Time I Got Reincarnated as a Slime - Temporada 4",
    episodeNumber: 20,
    epText: "Capítulo 20 (Nuevo Estreno)",
    slug: "that-time-i-got-reincarnated-as-a-slime-4",
    genres: ["Acción", "Aventura", "Comedia", "Fantasía", "Isekai"],
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx182205-q2AeO1owuQbO.jpg"
  },
  {
    title: "The Exiled Heavy Knight Knows How to Game the System",
    episodeNumber: 9,
    epText: "Capítulo 9 (Nuevo Estreno)",
    slug: "the-exiled-heavy-knight",
    genres: ["Acción", "Fantasía", "Aventura"],
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx180136-gtMTCRlOD4OE.jpg"
  },
  {
    title: "Jaadugar: A Witch in Mongolia",
    episodeNumber: 10,
    epText: "Capítulo 10 (Nuevo Estreno)",
    slug: "tenmaku-no-jaadugar",
    genres: ["Drama", "Histórico"],
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx190569-KnCQLI3Z8hPX.jpg"
  },
  {
    title: "The Elusive Samurai - Temporada 2",
    episodeNumber: 7,
    epText: "Capítulo 7 (Nuevo Estreno)",
    slug: "nige-jouzu-no-wakagimi-2nd-season",
    genres: ["Acción", "Aventura", "Histórico"],
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx162896-hSMTVceb50GY.jpg"
  }
];

function generateCaption(item) {
  const hashtagAnime = item.title.replace(/[^a-zA-Z0-9]/g, "");
  const genresText = item.genres.join(", ");
  const directLink = `${BASE_URL}/ver/${item.slug}?ep=${item.episodeNumber}`;

  return `🔥 ¡YA DISPONIBLE EN MEGAANIME SIN ANUNCIOS! 🔥

🎬 Anime: ${item.title}
📺 ${item.epText}
⭐ Géneros: ${genresText}
⚡ Servidor Exclusivo MegaAnime PRO HD (1080p Ultra HD)

🍿 ¡Disfrútalo ahora mismo en FULL HD nativo, con carga inmediata y sin molestos anuncios!

🌐 Ver Directo Aquí:
${directLink}

#megaAnime #AnimeEnEspañol #${hashtagAnime} #EstrenosAnime #Otaku #AnimeHD #AnimeOnline`;
}

async function publishAll() {
  console.log(`🚀 Iniciando publicación de ${airingEpisodesToPublish.length} animes en emisión en la página de Facebook (${pageId})...`);
  console.log(`🌐 Dominio oficial: ${BASE_URL}\n`);

  const results = [];

  for (const item of airingEpisodesToPublish) {
    const directLink = `${BASE_URL}/ver/${item.slug}?ep=${item.episodeNumber}`;
    const caption = generateCaption(item);

    console.log(`📌 Publicando "${item.title}" - ${item.epText}...`);
    console.log(`   Link directo: ${directLink}`);

    try {
      const postUrl = `https://graph.facebook.com/v19.0/${pageId}/photos`;
      const params = new URLSearchParams();
      params.append("url", item.coverUrl);
      params.append("caption", caption);
      params.append("access_token", pageToken);

      let response = await fetch(postUrl, {
        method: "POST",
        body: params
      });

      let resData = await response.json();

      // Fallback a /feed con link directo si falla la foto
      if (!response.ok || (!resData.id && !resData.post_id)) {
        console.warn(`⚠️ Aviso al publicar foto: ${resData.error?.message || "error"}. Intentando vía feed...`);
        const feedUrl = `https://graph.facebook.com/v19.0/${pageId}/feed`;
        const feedParams = new URLSearchParams();
        feedParams.append("message", caption);
        feedParams.append("link", directLink);
        feedParams.append("access_token", pageToken);

        response = await fetch(feedUrl, {
          method: "POST",
          body: feedParams
        });
        resData = await response.json();
      }

      if (response.ok && (resData.id || resData.post_id)) {
        const postId = resData.id || resData.post_id;
        console.log(`✅ ¡Publicado con éxito! Post ID: ${postId}\n`);
        results.push({
          title: item.title,
          episode: item.epText,
          link: directLink,
          postId: postId,
          status: "SUCCESS"
        });
      } else {
        console.error(`❌ Error en "${item.title}":`, resData);
        results.push({
          title: item.title,
          episode: item.epText,
          link: directLink,
          error: resData,
          status: "FAILED"
        });
      }

      // Pausa de 3 segundos para cumplir límites de velocidad de Facebook
      await new Promise(r => setTimeout(r, 3000));
    } catch (err) {
      console.error(`❌ Excepción en "${item.title}":`, err.message);
      results.push({
        title: item.title,
        episode: item.epText,
        link: directLink,
        error: err.message,
        status: "ERROR"
      });
    }
  }

  console.log("\n================ RESUMEN DE PUBLICACIONES ================");
  results.forEach(r => {
    console.log(`${r.status === "SUCCESS" ? "✅" : "❌"} ${r.title} (${r.episode}) -> Post ID: ${r.postId || "N/A"}`);
    console.log(`   Link: ${r.link}`);
  });
  console.log("==========================================================\n");
}

publishAll();
