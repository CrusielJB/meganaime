const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "megaanime-1c250"
  });
}

const db = admin.firestore();
const CATALOG_PATH = path.join(__dirname, "../src/data/catalog.json");
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf-8"));

async function syncToFirestore() {
  console.log(`\n🔥 SUBIENDO METADATOS Y PORTADAS A FIRESTORE (${catalog.length} ANIMES) 🔥\n`);

  const BATCH_SIZE = 450;
  let uploaded = 0;

  for (let i = 0; i < catalog.length; i += BATCH_SIZE) {
    const chunk = catalog.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    chunk.forEach(anime => {
      if (!anime.id) return;
      const ref = db.collection("animes").doc(anime.id);
      batch.set(ref, {
        id: anime.id,
        title: anime.title || "",
        coverUrl: anime.coverUrl || "",
        bannerUrl: anime.bannerUrl || anime.coverUrl || "",
        synopsis: anime.synopsis || "",
        genres: anime.genres || ["Anime"],
        rating: anime.rating || 8.0,
        status: anime.status || "Finalizado",
        type: anime.type || "Anime",
        year: anime.year || 2024,
        episodesCount: anime.episodesCount || 12,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });

    await batch.commit();
    uploaded += chunk.length;
    console.log(`✅ Subidos ${uploaded}/${catalog.length} animes a Firestore...`);
  }

  console.log("\n🎉 ¡TODOS LOS ANIMES Y PORTADAS SINCRONIZADOS EXITOSAMENTE EN FIRESTORE!");
}

syncToFirestore().catch(console.error);
