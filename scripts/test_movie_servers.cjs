const https = require("https");

const movies = [
  "your-name",
  "spirited-away",
  "demon-slayer-mugen-train-movie",
  "jujutsu-kaisen-0-movie",
  "suzume-movie",
  "one-piece-pelicula-gigantes"
];

async function checkMovie(mId) {
  const epId = `${mId}-ep-1`;
  const url = `https://megaanime-1c250.web.app/api/episode/${encodeURIComponent(epId)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log(`\n🎬 Movie: ${mId}`);
    console.log(`   Title: ${data.title}`);
    console.log(`   Servers (${data.videoServers?.length || 0}):`);
    (data.videoServers || []).forEach((s, idx) => {
      console.log(`     #${idx + 1}: ${s.name} -> ${s.url?.substring(0, 60)}...`);
    });
  } catch(e) {
    console.log(`❌ Error for ${mId}:`, e.message);
  }
}

(async () => {
  for (const m of movies) {
    await checkMovie(m);
  }
})();
