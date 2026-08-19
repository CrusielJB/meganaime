const fs = require("fs");
const path = require("path");

const CATALOG_PATH = path.join(__dirname, "../src/data/catalog.json");
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf-8"));

function cleanSearchTitle(title) {
  if (!title) return "";
  let clean = title
    .replace(/\s*-\s*Temporada\s*\d+/gi, "")
    .replace(/\s*-\s*Season\s*\d+/gi, "")
    .replace(/\s*2nd\s*Season/gi, "")
    .replace(/\s*3rd\s*Season/gi, "")
    .replace(/\s*4th\s*Season/gi, "")
    .replace(/\s*Part\s*\d+/gi, "")
    .replace(/\s*Parte\s*\d+/gi, "")
    .replace(/\s*\(TV\)/gi, "")
    .replace(/\s*TV/gi, "")
    .replace(/\s*Movie/gi, "")
    .replace(/\s*Película/gi, "")
    .replace(/\s*Audio\s*Latino/gi, "")
    .replace(/\s*Castellano/gi, "")
    .replace(/["'’]/g, "")
    .trim();
  return clean || title;
}

function escapeGraphQL(str) {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ");
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchAniListBatch(animesBatch) {
  const queryParts = animesBatch.map((a, idx) => {
    const search = escapeGraphQL(cleanSearchTitle(a.title));
    return `
      a${idx}: Media(search: "${search}", type: ANIME) {
        id
        title { romaji english native }
        coverImage { extraLarge large }
        bannerImage
        description(asHtml: false)
        genres
        averageScore
        status
        episodes
        seasonYear
      }
    `;
  });

  const query = `query { ${queryParts.join("\n")} }`;

  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(15000)
    });

    if (res.status === 429) {
      console.warn("⚠️ Rate limit hit, esperando 60s...");
      await sleep(60000);
      return null;
    }

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data?.data || null;
  } catch (e) {
    return null;
  }
}

async function main() {
  console.log(`\n🚀 INICIANDO SINCRONIZACIÓN DE METADATOS Y PORTADAS HD (${catalog.length} ANIMES) 🚀\n`);

  const BATCH_SIZE = 12;
  let updatedCount = 0;
  let totalBatches = Math.ceil(catalog.length / BATCH_SIZE);

  for (let i = 0; i < catalog.length; i += BATCH_SIZE) {
    const batch = catalog.slice(i, i + BATCH_SIZE);
    const batchIndex = Math.floor(i / BATCH_SIZE) + 1;

    process.stdout.write(`\r📦 Lote ${batchIndex}/${totalBatches} (${Math.min(i + BATCH_SIZE, catalog.length)}/${catalog.length} animes)... `);

    const result = await fetchAniListBatch(batch);
    if (result) {
      batch.forEach((anime, idx) => {
        const media = result[`a${idx}`];
        if (media) {
          if (media.coverImage?.extraLarge || media.coverImage?.large) {
            anime.coverUrl = media.coverImage.extraLarge || media.coverImage.large;
          }
          if (media.bannerImage) {
            anime.bannerUrl = media.bannerImage;
          }
          if (media.description && (!anime.synopsis || anime.synopsis.length < 20 || anime.synopsis.includes("Disfruta de"))) {
            anime.synopsis = media.description.replace(/<[^>]*>?/gm, "").trim();
          }
          if (media.averageScore) {
            anime.rating = parseFloat((media.averageScore / 10).toFixed(1));
          }
          if (media.seasonYear && !anime.year) {
            anime.year = media.seasonYear;
          }
          if (Array.isArray(media.genres) && media.genres.length > 0) {
            const merged = Array.from(new Set([...(anime.genres || []), ...media.genres]));
            anime.genres = merged.slice(0, 5);
          }
          updatedCount++;
        }
      });
    }

    // Save progress every 10 batches
    if (batchIndex % 10 === 0 || i + BATCH_SIZE >= catalog.length) {
      fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2), "utf-8");
    }

    await sleep(750);
  }

  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2), "utf-8");
  console.log(`\n\n🎉 METADATOS Y PORTADAS HD COMPLETADAS: ${updatedCount} animes actualizados en catalog.json!`);
}

main().catch(console.error);
