const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { execSync, spawn } = require("child_process");

const TEMP_DOWNLOAD_DIR = path.join(process.cwd(), "downloads_temp");
const MANIFEST_FILE = path.join(process.cwd(), "src/data/drive_episodes.json");
const CATALOG_FILE = path.join(process.cwd(), "src/data/catalog.json");
const AIRING_MAP_FILE = path.join(process.cwd(), "src/utils/airing_episodes.json");

if (!fs.existsSync(TEMP_DOWNLOAD_DIR)) {
  fs.mkdirSync(TEMP_DOWNLOAD_DIR, { recursive: true });
}

function loadManifest() {
  try {
    if (fs.existsSync(MANIFEST_FILE)) {
      return JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf-8"));
    }
  } catch (e) {}
  return {};
}

function saveManifest(manifest) {
  try {
    const dir = path.dirname(MANIFEST_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving manifest:", e);
  }
}

function sanitizeFolderName(name) {
  return name.replace(/[<>:"/\\|?*]/g, "_").trim();
}

async function resolveDirectVideoUrl(serverName, serverUrl) {
  try {
    const clean = serverUrl.split("?")[0].toLowerCase();
    if (clean.endsWith(".mp4") || clean.endsWith(".m3u8")) {
      return { url: serverUrl, isHls: clean.endsWith(".m3u8") };
    }

    if (serverUrl.includes("yourupload.com") || serverName.toLowerCase().includes("yourupload")) {
      const res = await fetch(serverUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://tioanime.com/"
        },
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        const html = await res.text();
        const m = html.match(/file\s*:\s*["'](https?:\/\/[^"']+\.mp4[^"']*)["']/i)
               || html.match(/src\s*:\s*["'](https?:\/\/[^"']+\.mp4[^"']*)["']/i)
               || html.match(/(https?:\/\/[^"'`\s\\]+\.mp4\b[^"'`\s]*)/i);
        if (m) return { url: m[1], isHls: false };
      }
    }

    if (serverUrl.includes("mp4upload.com") || serverName.toLowerCase().includes("mp4upload")) {
      const res = await fetch(serverUrl, {
        headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://tioanime.com/" },
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        const html = await res.text();
        const m = html.match(/src\s*:\s*["'](https?:\/\/[^"']+\.mp4[^"']*)["']/i)
               || html.match(/player\.src\(["'](https?:\/\/[^"']+\.mp4[^"']*)["']/i);
        if (m) return { url: m[1], isHls: false };
      }
    }
  } catch (e) {}
  return null;
}

function downloadTempFile(fileUrl, outputPath, refererUrl = "") {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    const client = fileUrl.startsWith("https") ? https : http;

    const req = client.get(fileUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": refererUrl || "https://tioanime.com/",
        "Accept": "*/*"
      }
    }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        return downloadTempFile(response.headers.location, outputPath, refererUrl).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        file.close();
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        return reject(new Error(`Server returned HTTP ${response.statusCode}`));
      }

      const totalBytes = parseInt(response.headers['content-length'] || "0", 10);
      let downloadedBytes = 0;
      let lastReport = Date.now();

      response.on("data", (chunk) => {
        downloadedBytes += chunk.length;
        if (Date.now() - lastReport > 2000) {
          lastReport = Date.now();
          const percent = totalBytes > 0 ? ((downloadedBytes / totalBytes) * 100).toFixed(1) + "%" : `${(downloadedBytes / (1024 * 1024)).toFixed(1)} MB`;
          process.stdout.write(`\r   ⏳ Descargando: ${percent}...`);
        }
      });

      response.pipe(file);

      file.on("finish", () => {
        file.close(() => {
          process.stdout.write(`\r   📥 Descargado localmente: ${(downloadedBytes / (1024 * 1024)).toFixed(2)} MB\n`);
          resolve({ sizeMB: (downloadedBytes / (1024 * 1024)).toFixed(2) });
        });
      });
    });

    req.on("error", (err) => {
      file.close();
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      reject(err);
    });

    req.setTimeout(45000, () => {
      req.destroy(new Error("Download timeout"));
    });
  });
}

function uploadToGoogleDrive(localFilePath, remoteAnimeFolder, filename) {
  return new Promise((resolve, reject) => {
    const remoteDest = `gdrive:MegaAnime_HD/${remoteAnimeFolder}/${filename}`;
    console.log(`   ☁️ Subiendo directamente a Google Drive: "${remoteDest}"...`);

    const rclone = spawn("rclone", ["copyto", localFilePath, remoteDest, "--progress"]);

    rclone.stdout.on("data", (data) => {
      process.stdout.write(`\r   ☁️ ${data.toString().trim()}`);
    });

    rclone.stderr.on("data", () => {});

    rclone.on("close", (code) => {
      if (code === 0) {
        console.log(`\n   ✅ Subido exitosamente a Google Drive: "${filename}"`);
        // Remove temporary local file immediately to free up Mac disk space
        if (fs.existsSync(localFilePath)) {
          fs.unlinkSync(localFilePath);
          console.log(`   🧹 Archivo temporal local eliminado para ahorrar espacio en tu Mac.`);
        }
        resolve({ success: true, remotePath: remoteDest });
      } else {
        reject(new Error(`rclone exited with code ${code}`));
      }
    });
  });
}

async function processAnime(anime, targetEps = null) {
  const animeFolderName = sanitizeFolderName(anime.title);
  const manifest = loadManifest();
  if (!manifest[anime.id]) {
    manifest[anime.id] = {
      title: anime.title,
      episodes: {}
    };
  }

  let maxEps = anime.episodesCount || 1;
  try {
    const map = JSON.parse(fs.readFileSync(AIRING_MAP_FILE, "utf-8"));
    if (map[anime.id]) maxEps = map[anime.id];
  } catch(e) {}
  if (anime.id.includes("one-piece")) maxEps = 1174;

  const startEp = targetEps ? targetEps.start : maxEps;
  const endEp = targetEps ? targetEps.end : maxEps;

  console.log(`\n======================================================`);
  console.log(`🎬 Anime: "${anime.title}"`);
  console.log(`☁️ Carpeta en Google Drive: "MegaAnime_HD/${animeFolderName}"`);
  console.log(`📺 Procesando episodios del ${startEp} al ${endEp} (Último emitido: ${maxEps})`);
  console.log(`======================================================`);

  for (let ep = startEp; ep <= endEp; ep++) {
    const epKey = `ep-${ep}`;
    const filename = `${animeFolderName} - Episodio ${String(ep).padStart(2, '0')}.mp4`;
    const tempPath = path.join(TEMP_DOWNLOAD_DIR, filename);

    // Check if already in manifest
    if (manifest[anime.id].episodes[epKey] && manifest[anime.id].episodes[epKey].gdrivePath) {
      console.log(`⚡ Episodio ${ep} ya existe en tu Google Drive. Omitiendo.`);
      continue;
    }

    console.log(`\n🔎 [Episodio ${ep}] Buscando servidor Full HD 1080p...`);
    try {
      const episodeId = `${anime.id}-ep-${ep}`;
      const epApiUrl = `https://megaanime-1c250.web.app/api/episode/${encodeURIComponent(episodeId)}`;
      const apiRes = await fetch(epApiUrl, { signal: AbortSignal.timeout(10000) });
      if (!apiRes.ok) {
        console.warn(`⚠️ No se pudo obtener servidores para episodio ${ep}.`);
        continue;
      }

      const epData = await apiRes.json();
      const servers = epData.videoServers || [];
      console.log(`   Servidores encontrados: ${servers.length}`);

      let directStream = null;
      let usedServer = null;

      for (const server of servers) {
        console.log(`   Probando extracción en ${server.name}...`);
        const resolved = await resolveDirectVideoUrl(server.name, server.url);
        if (resolved && resolved.url && !resolved.isHls) {
          directStream = resolved.url;
          usedServer = server;
          break;
        }
      }

      if (directStream) {
        console.log(`   🚀 Enlace MP4 Full HD directo obtenido desde ${usedServer.name}!`);
        const dlResult = await downloadTempFile(directStream, tempPath, usedServer.url);

        // Upload to Google Drive
        const uploadResult = await uploadToGoogleDrive(tempPath, animeFolderName, filename);

        manifest[anime.id].episodes[epKey] = {
          gdrivePath: uploadResult.remotePath,
          filename: filename,
          sizeMB: dlResult.sizeMB,
          uploadedAt: new Date().toISOString()
        };
        saveManifest(manifest);
      } else {
        console.warn(`   ⚠️ No se pudo extraer enlace MP4 directo para el episodio ${ep} en esta pasada.`);
      }
    } catch (err) {
      console.error(`   ❌ Error procesando episodio ${ep}:`, err.message);
    }
  }
}

(async () => {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, "utf-8"));
  const airing = catalog.filter(a => a.status === "En emisión");

  console.log(`☁️ MEGA ANIME ➔ GOOGLE DRIVE (5 TB) PIPELINE EN VIVO ☁️`);
  console.log(`Total de Series en Emisión: ${airing.length}`);
  console.log(`Destino Remoto: gdrive:MegaAnime_HD/\n`);

  for (const anime of airing) {
    try {
      await processAnime(anime);
    } catch (e) {
      console.error(`Error en ${anime.title}:`, e);
    }
  }

  console.log(`\n🎉 Subida directa a Google Drive completada para todos los animes en emisión.`);
})();
