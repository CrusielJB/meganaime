const dotenv = require("dotenv");
dotenv.config();

const pageId = process.env.FACEBOOK_PAGE_ID || "1375353446122077";
const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || "EAAPY6fJZB22ABSCkBRNDTaALhaLA5xUKDOW02qfT6q838T0mjwk7LZCOyZC4d1jYoAhV7ZCist1lVVpdlWGBbu15L4P9YZCki9D4UYZAFYlG6y5eHo6NDBdvHFxHx6D9IgDdUkcBthE8srQtv9b3W1aRHjtWIZAX7IHEo9CxdEeHMBpQWIacZAyBDNBekI7jttTjDo8U";

async function deleteOldPosts() {
  console.log(`[FB Cleanup] Iniciando escaneo y borrado de posts con dominio antiguo en la página ${pageId}...`);

  let deletedCount = 0;
  let hasMore = true;
  let pageIndex = 1;

  while (hasMore) {
    const url = `https://graph.facebook.com/v19.0/${pageId}/feed?fields=id,message,created_time&limit=50&access_token=${token}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.data || data.data.length === 0) {
      console.log("[FB Cleanup] No se encontraron más publicaciones en el feed.");
      break;
    }

    const postsToDelete = data.data.filter(p => {
      const msg = (p.message || "").toLowerCase();
      return msg.includes("megaanime-1c250.web.app") || msg.includes("megaanime.net");
    });

    if (postsToDelete.length === 0) {
      console.log(`[FB Cleanup] Página ${pageIndex}: no hay más posts con el dominio viejo.`);
      break;
    }

    console.log(`[FB Cleanup] Página ${pageIndex}: eliminando ${postsToDelete.length} posts con dominio viejo...`);

    for (const post of postsToDelete) {
      try {
        const delRes = await fetch(`https://graph.facebook.com/v19.0/${post.id}?access_token=${token}`, {
          method: "DELETE"
        });
        const delData = await delRes.json();
        if (delRes.ok && delData.success) {
          deletedCount++;
          process.stdout.write(`\r[FB Cleanup] 🗑️  Borrados: ${deletedCount} posts...`);
        } else {
          console.warn(`\n[FB Cleanup] Error borrando post ${post.id}:`, delData);
        }
      } catch (err) {
        console.error(`\n[FB Cleanup] Excepción borrando ${post.id}:`, err.message);
      }
      // Small pause to respect Meta rate limits
      await new Promise(r => setTimeout(r, 250));
    }
    pageIndex++;
  }

  console.log(`\n[FB Cleanup] ✅ Finalizado: Se borraron ${deletedCount} posts con el dominio antiguo.`);
}

deleteOldPosts().catch(console.error);
