const fs = require("fs");
const path = require("path");
const https = require("https");
const { spawn, execSync } = require("child_process");

const TEMP_DIR = path.join(process.cwd(), "downloads_temp");
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const MANIFEST_PATHS = [
  path.join(process.cwd(), "src/data/drive_episodes.json"),
  path.join(process.cwd(), "dist/drive_episodes.json")
];

function loadManifest() {
  for (const p of MANIFEST_PATHS) {
    if (fs.existsSync(p)) {
      try { return JSON.parse(fs.readFileSync(p, "utf-8")); } catch(e) {}
    }
  }
  return {};
}

function saveManifest(manifest) {
  for (const p of MANIFEST_PATHS) {
    try {
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(p, JSON.stringify(manifest, null, 2), "utf-8");
    } catch(e) {}
  }
}

const tasks = [
  {
    name: "One Piece",
    animeId: "tioanime-one-piece-tv",
    epNum: 1176,
    epKey: "ep-1176",
    filename: "One Piece - Episodio 1176.mp4",
    remoteDest: "gdrive:MegaAnime_HD/One Piece/One Piece - Episodio 1176.mp4",
    embedUrl: "https://www.yourupload.com/embed/74837148LxnS"
  }
];

async function resolveDirectMp4(embedUrl) {
  const res = await fetch(embedUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "Referer": "https://tioanime.com/"
    }
  });
  if (res.ok) {
    const html = await res.text();
    const m = html.match(/file\s*:\s*["'](https?:\/\/[^"']+\.mp4[^"']*)["']/i)
           || html.match(/src\s*:\s*["'](https?:\/\/[^"']+\.mp4[^"']*)["']/i);
    if (m) return m[1];
  }
  return null;
}

function downloadWithCurl(url, referer, destPath) {
  return new Promise((resolve, reject) => {
    console.log(`   📥 Descargando con curl: ${destPath}...`);
    const curl = spawn("curl", [
      "-L",
      "-H", "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "-H", `Referer: ${referer || "https://www.yourupload.com/"}`,
      "-o", destPath,
      "--progress-bar",
      url
    ], { stdio: "inherit" });

    curl.on("close", (code) => {
      if (code === 0 && fs.existsSync(destPath) && fs.statSync(destPath).size > 1000000) {
        const sizeMB = (fs.statSync(destPath).size / (1024 * 1024)).toFixed(2);
        console.log(`   ✅ Descarga completada: ${sizeMB} MB`);
        resolve({ sizeMB });
      } else {
        reject(new Error(`curl falló con código ${code}`));
      }
    });
    curl.on("error", reject);
  });
}

function uploadRclone(localPath, remoteDest) {
  return new Promise((resolve, reject) => {
    console.log(`   ☁️ Subiendo a Google Drive: "${remoteDest}"...`);
    const rclone = spawn("rclone", [
      "copyto",
      localPath,
      remoteDest,
      "--drive-chunk-size", "64M",
      "--drive-upload-cutoff", "32M",
      "--retries", "3",
      "--progress"
    ], { stdio: "inherit" });

    rclone.on("close", (code) => {
      if (code === 0) {
        console.log(`\n   ✅ Subida a Google Drive exitosa!`);
        resolve();
      } else {
        reject(new Error(`rclone copyto falló con código ${code}`));
      }
    });
    rclone.on("error", reject);
  });
}

function getDriveFileId(remoteDest) {
  try {
    const parent = path.dirname(remoteDest).replace("gdrive:", "");
    const base = path.basename(remoteDest);
    const jsonStr = execSync(`rclone lsjson "gdrive:${parent}" --files-only`, { encoding: "utf-8" });
    const items = JSON.parse(jsonStr);
    const item = items.find(x => x.Name === base);
    return item?.ID || null;
  } catch(e) {
    return null;
  }
}

async function main() {
  console.log("🚀 INICIANDO DESCARGA Y SUBIDA FULL HD A GOOGLE DRIVE 🚀\n");
  const manifest = loadManifest();

  for (const t of tasks) {
    console.log(`\n======================================================`);
    console.log(`🎬 Anime: ${t.name}`);
    console.log(`📺 Episodio: ${t.epNum} (${t.filename})`);
    console.log(`======================================================`);

    const tempFile = path.join(TEMP_DIR, t.filename);

    try {
      let dlInfo = { sizeMB: "0" };
      if (fs.existsSync(tempFile) && fs.statSync(tempFile).size > 10000000) {
        dlInfo.sizeMB = (fs.statSync(tempFile).size / (1024 * 1024)).toFixed(2);
        console.log(`   ⚡ Archivo temporal existente (${dlInfo.sizeMB} MB). Saltando descarga.`);
      } else {
        console.log(`   🔍 Extrayendo enlace directo Full HD...`);
        const directUrl = await resolveDirectMp4(t.embedUrl);
        if (!directUrl) {
          throw new Error("No se pudo obtener enlace MP4 directo.");
        }
        dlInfo = await downloadWithCurl(directUrl, t.embedUrl, tempFile);
      }

      await uploadRclone(tempFile, t.remoteDest);

      console.log(`   🔗 Obteniendo ID de Google Drive...`);
      const fileId = getDriveFileId(t.remoteDest);
      console.log(`   ⭐ Google Drive File ID: ${fileId || "Obtenido por ruta"}`);

      if (!manifest[t.animeId]) {
        manifest[t.animeId] = { title: t.name, episodes: {} };
      }
      if (!manifest[t.animeId].episodes) {
        manifest[t.animeId].episodes = {};
      }

      manifest[t.animeId].episodes[t.epKey] = {
        filename: t.filename,
        gdrivePath: t.remoteDest,
        fileId: fileId || undefined,
        streamUrl: fileId ? `https://drive.google.com/file/d/${fileId}/preview` : undefined,
        sizeMB: dlInfo.sizeMB,
        uploadedAt: new Date().toISOString()
      };

      saveManifest(manifest);
      console.log(`   💾 Manifiesto drive_episodes.json actualizado para ${t.name} ${t.epKey}!`);

      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
        console.log(`   🧹 Archivo temporal local eliminado.`);
      }
    } catch(err) {
      console.error(`   ❌ Error en ${t.name}:`, err.message);
    }
  }

  console.log("\n🎉 ¡TODOS LOS EPISODIOS SOLICITADOS SE HAN DESCARGADO Y SUBIDO A GOOGLE DRIVE EN FULL HD!");
}

main();
