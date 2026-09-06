const dotenv = require("dotenv");
dotenv.config();

const pageId = process.env.FACEBOOK_PAGE_ID || "1375353446122077";
const pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

if (!pageId || !pageToken) {
  console.error("❌ Faltan credenciales de Facebook en .env");
  process.exit(1);
}

const BASE_URL = "https://mega-anime.com";

const animesToPublish = [
  {
    title: "Mushoku Tensei: Jobless Reincarnation - Temporada 3",
    episodeNumber: 10,
    epText: "Capítulo 10 (Nuevo Estreno)",
    slug: "tioanime-mushoku-tensei-iii-isekai-ittara-honki-dasu",
    genres: ["Aventura", "Drama", "Fantasía", "Isekai"],
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx108465-1ANspF1EWyFx.jpg"
  },
  {
    title: "Black Torch",
    episodeNumber: 9,
    epText: "Capítulo 9 (Nuevo Estreno)",
    slug: "tioanime-black-torch",
    genres: ["Acción", "Sobrenatural", "Shounen", "Ninjas"],
    coverUrl: "https://tioanime.com/uploads/portadas/4452.jpg"
  },
  {
    title: "Ryōmin 0-nin Start no Henkyō Ryōshu-sama",
    episodeNumber: 9,
    epText: "Capítulo 9 (Nuevo Estreno)",
    slug: "tioanime-ryoumin-0nin-start-no-henkyou-ryoushusama",
    genres: ["Acción", "Aventura", "Fantasía", "Isekai"],
    coverUrl: "https://tioanime.com/uploads/portadas/4445.jpg"
  },
  {
    title: "Bleach: Thousand-Year Blood War - Parte 4",
    episodeNumber: 46,
    epText: "Capítulo 46 (Nuevo Estreno)",
    slug: "tioanime-bleach-sennen-kessenhen",
    genres: ["Acción", "Aventura", "Sobrenatural", "Shounen"],
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx185874-aU3e6tBT6wwA.jpg"
  },
  {
    title: "One Piece",
    episodeNumber: 1176,
    epText: "Capítulo 1176 (Arco de Egghead)",
    slug: "tioanime-one-piece-tv",
    genres: ["Acción", "Aventura", "Fantasía", "Shounen"],
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21-YCDoj1EkAxFn.jpg"
  },
  {
    title: "Tensei shitara Slime Datta Ken 4th Season",
    episodeNumber: 20,
    epText: "Capítulo 20 (Nuevo Estreno)",
    slug: "tioanime-tensei-shitara-slime-datta-ken-4th-season",
    genres: ["Acción", "Aventura", "Comedia", "Fantasía", "Isekai"],
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx182205-q2AeO1owuQbO.jpg"
  }
];

function generateCaption(item) {
  const hashtagAnime = item.title.replace(/[^a-zA-Z0-9]/g, "");
  const genresText = item.genres.join(", ");
  const url = `${BASE_URL}/ver/${item.slug}`;

  return `🔥 ¡YA DISPONIBLE EN megaAnime SIN ANUNCIOS! 🔥

🎬 Anime: ${item.title}
📺 ${item.epText}
⭐ Géneros: ${genresText}
⚡ Servidor Exclusivo MegaAnime (1080p Ultra HD)

🍿 ¡Disfrútalo ahora mismo en FULL HD nativo, sin anuncios molestos y con la máxima velocidad de streaming!

🌐 Ver Directo Aquí:
${url}

#megaAnime #AnimeEnEspañol #${hashtagAnime} #EstrenoAnime #Otaku #AnimeHD #AnimeOnline`;
}

async function publishAll() {
  console.log(`🚀 Iniciando publicación de ${animesToPublish.length} animes en emisión en Facebook Page (${pageId}) usando link de Firebase/Firestore (${BASE_URL})...\n`);

  for (const item of animesToPublish) {
    try {
      console.log(`📌 Publicando "${item.title}" (${item.epText})...`);
      const caption = generateCaption(item);
      const postUrl = `https://graph.facebook.com/v19.0/${pageId}/photos`;

      // Post photo with URL and caption
      const params = new URLSearchParams();
      params.append("url", item.coverUrl);
      params.append("caption", caption);
      params.append("access_token", pageToken);

      let response = await fetch(postUrl, {
        method: "POST",
        body: params
      });

      let resData = await response.json();

      // If photo URL failed, fallback to feed post
      if (!response.ok || (!resData.id && !resData.post_id)) {
        console.warn(`⚠️ Error publicando foto via URL (${resData.error?.message || "unknown"}). Intentando vía feed...`);
        const feedUrl = `https://graph.facebook.com/v19.0/${pageId}/feed`;
        const feedParams = new URLSearchParams();
        feedParams.append("message", caption);
        feedParams.append("link", `${BASE_URL}/ver/${item.slug}`);
        feedParams.append("access_token", pageToken);

        response = await fetch(feedUrl, {
          method: "POST",
          body: feedParams
        });
        resData = await response.json();
      }

      if (response.ok && (resData.id || resData.post_id)) {
        const postId = resData.id || resData.post_id;
        console.log(`✅ ¡Publicado con éxito en Facebook!`);
        console.log(`   ID del Post: ${postId}`);
        console.log(`   Link compartido: ${BASE_URL}/ver/${item.slug}\n`);
      } else {
        console.error(`❌ Falló la publicación de "${item.title}":`, resData);
      }

      // Small delay between posts to avoid Facebook spam filter
      await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
      console.error(`❌ Excepción al publicar "${item.title}":`, e.message);
    }
  }

  console.log("🎉 Proceso de publicaciones en Facebook finalizado.");
}

publishAll();
