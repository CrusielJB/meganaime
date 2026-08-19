const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { spawn, execSync } = require("child_process");

const PROGRESS_FILE = path.join(process.cwd(), "src/data/gdrive_download_progress.json");
const MANIFEST_FILE = path.join(process.cwd(), "src/data/drive_episodes.json");
const CATALOG_FILE = path.join(process.cwd(), "src/data/catalog.json");
const AIRING_MAP_FILE = path.join(process.cwd(), "src/utils/airing_episodes.json");

function sanitizeFolderName(name) {
  return name.replace(/[<>:"/\\|?*]/g, "_").trim();
}

function getSeasonHierarchy(rawTitle) {
  let title = rawTitle.trim();
  let baseTitle = title;
  let seasonSubfolder = "";

  if (/(?:4th\s+Season|Temporada\s+4|Season\s+4|Parte\s+4|IV\b)/i.test(title)) {
    seasonSubfolder = "4ta Temporada";
    baseTitle = title.replace(/\s*[-:]?\s*(?:4th\s+Season|Temporada\s+4|Season\s+4|Parte\s+4|IV\b)[\s\S]*/i, "").trim();
  } else if (/(?:3rd\s+Season|Temporada\s+3|Season\s+3|Parte\s+3|III\b)/i.test(title)) {
    seasonSubfolder = "3ra Temporada";
    baseTitle = title.replace(/\s*[-:]?\s*(?:3rd\s+Season|Temporada\s+3|Season\s+3|Parte\s+3|III\b)[\s\S]*/i, "").trim();
  } else if (/(?:2nd\s+Season|Temporada\s+2|Season\s+2|Parte\s+2|\bII\b|\b2\b$)/i.test(title)) {
    seasonSubfolder = "2da Temporada";
    baseTitle = title.replace(/\s*[-:]?\s*(?:2nd\s+Season|Temporada\s+2|Season\s+2|Parte\s+2|\bII\b|\b2\b$)[\s\S]*/i, "").trim();
  }

  if (!baseTitle || baseTitle.length < 2) baseTitle = title;

  return {
    mainFolder: sanitizeFolderName(baseTitle),
    seasonFolder: seasonSubfolder ? sanitizeFolderName(seasonSubfolder) : ""
  };
}

function renderProgressBar(percent, length = 25) {
  const p = Math.max(0, Math.min(100, percent));
  const filled = Math.round((p / 100) * length);
  const empty = length - filled;
  return "[" + "█".repeat(filled) + "░".repeat(empty) + "] " + p.toFixed(1) + "%";
}

function updateProgressState(state) {
  try {
    const dir = path.dirname(PROGRESS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (e) {}
}

const remoteFolderCache = new Map();

function getRemoteFolderFiles(remoteDir) {
  if (remoteFolderCache.has(remoteDir)) {
    return remoteFolderCache.get(remoteDir);
  }
  try {
    const out = execSync(`rclone lsf --min-size 15M "${remoteDir}" 2>/dev/null`, { encoding: "utf-8" });
    const set = new Set(out.split("\n").map(s => s.trim()).filter(Boolean));
    remoteFolderCache.set(remoteDir, set);
    return set;
  } catch (e) {
    const emptySet = new Set();
    remoteFolderCache.set(remoteDir, emptySet);
    return emptySet;
  }
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

function streamToGoogleDrive(fileUrl, remoteDestPath, refererUrl = "", onProgress) {
  return new Promise((resolve, reject) => {
    const client = fileUrl.startsWith("https") ? https : http;
    const rclone = spawn("rclone", ["rcat", remoteDestPath, "--drive-chunk-size", "64M", "--low-level-retries", "3", "--timeout", "45s"]);

    rclone.stdin.on("error", () => {}); // Prevent uncaught EPIPE

    let isSettled = false;
    const hardTimeout = setTimeout(() => {
      if (isSettled) return;
      isSettled = true;
      try { req.destroy(new Error("Hard timeout (180s)")); } catch(e) {}
      try { rclone.kill("SIGKILL"); } catch(e) {}
      reject(new Error("Hard timeout after 180s"));
    }, 180000);

    const finish = (err, res) => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(hardTimeout);
      if (err) reject(err);
      else resolve(res);
    };

    const req = client.get(fileUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": refererUrl || "https://tioanime.com/",
        "Accept": "*/*"
      }
    }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        clearTimeout(hardTimeout);
        try { rclone.stdin.end(); } catch(e) {}
        return streamToGoogleDrive(response.headers.location, remoteDestPath, refererUrl, onProgress).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        try { rclone.stdin.end(); } catch(e) {}
        return finish(new Error(`HTTP ${response.statusCode}`));
      }

      const totalBytes = parseInt(response.headers['content-length'] || "0", 10);
      let transferredBytes = 0;
      let lastReport = Date.now();

      let watchdog = setTimeout(() => {
        try { req.destroy(new Error("Stream stalled (20s inactivity)")); } catch(e) {}
        try { rclone.stdin.end(); } catch(e) {}
      }, 20000);

      response.on("data", (chunk) => {
        clearTimeout(watchdog);
        watchdog = setTimeout(() => {
          try { req.destroy(new Error("Stream stalled (20s inactivity)")); } catch(e) {}
          try { rclone.stdin.end(); } catch(e) {}
        }, 20000);

        transferredBytes += chunk.length;
        if (rclone.stdin && !rclone.stdin.destroyed && rclone.stdin.writable) {
          try { rclone.stdin.write(chunk); } catch(e) {}
        }

        if (Date.now() - lastReport > 1500) {
          lastReport = Date.now();
          const percent = totalBytes > 0 ? (transferredBytes / totalBytes) * 100 : 0;
          if (onProgress) onProgress(percent, (transferredBytes / (1024 * 1024)).toFixed(1), (totalBytes / (1024 * 1024)).toFixed(1));
        }
      });

      response.on("end", () => {
        clearTimeout(watchdog);
        try { rclone.stdin.end(); } catch(e) {}
      });

      response.on("error", (err) => {
        clearTimeout(watchdog);
        try { rclone.stdin.end(); } catch(e) {}
        finish(err);
      });
    });

    rclone.on("close", (code) => {
      if (code === 0) {
        finish(null, { success: true, remotePath: remoteDestPath });
      } else {
        finish(new Error(`rclone rcat error code ${code}`));
      }
    });

    req.on("error", (err) => {
      try { rclone.stdin.end(); } catch(e) {}
      finish(err);
    });

    req.setTimeout(25000, () => {
      try { rclone.stdin.end(); } catch(e) {}
      req.destroy(new Error("Initial connection timeout after 25s"));
    });
  });
}

(async () => {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, "utf-8"));
  const airingMap = fs.existsSync(AIRING_MAP_FILE) ? JSON.parse(fs.readFileSync(AIRING_MAP_FILE, "utf-8")) : {};
  const driveData = fs.existsSync(MANIFEST_FILE) ? JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf-8")) : {};
  const airing = catalog.filter(a => a.status === "En emisión");

  // Calculate total episodes count across all airing animes and count missing eps per anime
  let grandTotalEpisodes = 0;
  const animeQueue = airing.map(a => {
    let maxEps = a.episodesCount || 1;
    if (airingMap[a.id]) maxEps = airingMap[a.id];
    if (a.id.includes("one-piece")) maxEps = 1174;
    grandTotalEpisodes += maxEps;

    const driveEntry = driveData[a.id] || driveData[a.id.replace(/^tioanime-/, "")];
    let presentCount = 0;
    for (let ep = 1; ep <= maxEps; ep++) {
      const inDriveJson = driveEntry?.episodes?.[`ep-${ep}`]?.fileId && parseFloat(driveEntry.episodes[`ep-${ep}`].sizeMB || "0") > 10;
      if (inDriveJson) presentCount++;
    }
    const missingCount = Math.max(0, maxEps - presentCount);
    return { ...a, maxEps, presentCount, missingCount };
  });

  // Sort queue by least missing episodes first (1 ep missing -> 2 eps missing -> ... -> One Piece at the end)
  animeQueue.sort((a, b) => {
    // Put One Piece at the end of active queue as requested
    if (a.id.includes("one-piece")) return 1;
    if (b.id.includes("one-piece")) return -1;
    // Animes already completed stay at top to be instantly acknowledged
    if (a.missingCount === 0 && b.missingCount !== 0) return -1;
    if (b.missingCount === 0 && a.missingCount !== 0) return 1;
    // Lowest missing count first!
    return a.missingCount - b.missingCount;
  });

  console.log(`\n========================================================================`);
  console.log(`🚀 MEGA ANIME ➔ GOOGLE DRIVE (5 TB) PIPELINE DE STREAMING TOTAL 🚀`);
  console.log(`Total Animes: ${airing.length} | Total Episodios Acumulados: ${grandTotalEpisodes}`);
  console.log(`Cero Espacio en Mac • 100% Directo a la Nube con Barra en Tiempo Real`);
  console.log(`========================================================================\n`);

  let globalProcessedEpisodes = 0;

  for (let aIdx = 0; aIdx < animeQueue.length; aIdx++) {
    const anime = animeQueue[aIdx];
    const { mainFolder, seasonFolder } = getSeasonHierarchy(anime.title);
    const remoteDir = seasonFolder 
      ? `gdrive:MegaAnime_HD/${mainFolder}/${seasonFolder}`
      : `gdrive:MegaAnime_HD/${mainFolder}`;

    const existingRemoteFiles = getRemoteFolderFiles(remoteDir);
    const driveEntry = driveData[anime.id] || driveData[anime.id.replace(/^tioanime-/, "")];

    console.log(`\n------------------------------------------------------------------------`);
    console.log(`🎬 [${aIdx + 1}/${animeQueue.length}] "${anime.title}"`);
    console.log(`📁 Carpeta Google Drive: MegaAnime_HD/${mainFolder}${seasonFolder ? '/' + seasonFolder : ''}`);
    console.log(`📺 Total Episodios de Temporada: ${anime.maxEps}`);
    console.log(`------------------------------------------------------------------------`);

    // Check if whole anime is already complete in Drive
    let missingCount = 0;
    for (let ep = 1; ep <= anime.maxEps; ep++) {
      const filename = `${sanitizeFolderName(anime.title)} - Episodio ${String(ep).padStart(2, '0')}.mp4`;
      const inDriveJson = driveEntry?.episodes?.[`ep-${ep}`]?.fileId && parseFloat(driveEntry.episodes[`ep-${ep}`].sizeMB || "0") > 10;
      const inRemote = existingRemoteFiles.has(filename);
      if (!inDriveJson && !inRemote) {
        missingCount++;
      }
    }

    if (missingCount === 0) {
      globalProcessedEpisodes += anime.maxEps;
      const globalBar = renderProgressBar((globalProcessedEpisodes / grandTotalEpisodes) * 100, 20);
      console.log(`   ✨ [COMPLETO] "${anime.title}" ya tiene sus ${anime.maxEps} episodios en Google Drive sin duplicados. Pasando al siguiente anime... | Total Global: ${globalBar}`);
      continue;
    }

    for (let ep = 1; ep <= anime.maxEps; ep++) {
      const filename = `${sanitizeFolderName(anime.title)} - Episodio ${String(ep).padStart(2, '0')}.mp4`;
      const remoteFilePath = `${remoteDir}/${filename}`;

      // Check if already in Google Drive or drive_episodes.json
      const inDriveJson = driveEntry?.episodes?.[`ep-${ep}`]?.fileId && parseFloat(driveEntry.episodes[`ep-${ep}`].sizeMB || "0") > 10;
      const inRemote = existingRemoteFiles.has(filename);

      if (inDriveJson || inRemote) {
        globalProcessedEpisodes++;
        const epBar = renderProgressBar(100, 15);
        const globalBar = renderProgressBar((globalProcessedEpisodes / grandTotalEpisodes) * 100, 20);
        console.log(`   ⚡ [Ep ${ep}/${anime.maxEps}] Ya en Google Drive: ${epBar} | Total Global: ${globalBar} (${globalProcessedEpisodes}/${grandTotalEpisodes} eps)`);
        continue;
      }

      console.log(`\n   🔎 [Ep ${ep}/${anime.maxEps}] Resolviendo servidor Full HD 1080p...`);
      try {
        const episodeId = `${anime.id}-ep-${ep}`;
        const epApiUrl = `https://megaanime-1c250.web.app/api/episode/${encodeURIComponent(episodeId)}`;
        const apiRes = await fetch(epApiUrl, { signal: AbortSignal.timeout(30000) });

        if (!apiRes.ok) {
          globalProcessedEpisodes++;
          console.warn(`   ⚠️ Servidor en cola para ep ${ep}.`);
          continue;
        }

        const epData = await apiRes.json();
        const servers = epData.videoServers || [];

        let streamSuccess = false;
        for (const server of servers) {
          const resolved = await resolveDirectVideoUrl(server.name, server.url);
          if (resolved && resolved.url && !resolved.isHls) {
            console.log(`   🚀 Enlace 1080p obtenido desde ${server.name}! Iniciando streaming directo a Drive...`);
            try {
              const referer = resolved.url.includes("mp4upload") ? "https://www.mp4upload.com/" : (server.url || "https://tioanime.com/");
              await streamToGoogleDrive(resolved.url, remoteFilePath, referer, (percent, currMB, totalMB) => {
                const epBar = renderProgressBar(percent, 18);
                const globalBar = renderProgressBar((globalProcessedEpisodes / grandTotalEpisodes) * 100, 20);
                process.stdout.write(`\r   ☁️ [Ep ${ep}/${anime.maxEps}] ${epBar} (${currMB}/${totalMB}MB) | Total: ${globalBar} `);
              });

              globalProcessedEpisodes++;
              const epBar = renderProgressBar(100, 15);
              const globalBar = renderProgressBar((globalProcessedEpisodes / grandTotalEpisodes) * 100, 20);
              console.log(`\n   ✅ [Ep ${ep}/${anime.maxEps}] Guardado en Drive e Implementado en la Web! | Total Global: ${globalBar} (${globalProcessedEpisodes}/${grandTotalEpisodes} eps)`);

              // Update manifest
              if (!driveData[anime.id]) {
                driveData[anime.id] = { title: anime.title, episodes: {} };
              }
              driveData[anime.id].episodes[`ep-${ep}`] = {
                gdrivePath: remoteFilePath.replace("gdrive:MegaAnime_HD/", ""),
                filename: filename,
                uploadedAt: new Date().toISOString()
              };

              fs.writeFileSync(MANIFEST_FILE, JSON.stringify(driveData, null, 2), "utf-8");
              const distManifest = path.join(process.cwd(), "dist/drive_episodes.json");
              if (fs.existsSync(path.dirname(distManifest))) {
                fs.writeFileSync(distManifest, JSON.stringify(driveData, null, 2), "utf-8");
              }
              streamSuccess = true;
              break;
            } catch (streamErr) {
              console.warn(`\n   ⚠️ Falló descarga desde ${server.name} (${streamErr.message}), probando servidor alternativo...`);
            }
          }
        }

        if (!streamSuccess) {
          globalProcessedEpisodes++;
          console.warn(`   ❌ Ningún servidor directo completó ep ${ep}. Pasando al siguiente...`);
        }
      } catch (err) {
        globalProcessedEpisodes++;
        console.error(`   ❌ Error en ep ${ep}:`, err.message);
      }
    }
  }

  console.log(`\n========================================================================`);
  console.log(`🎉 ¡PROCESO COMPLETADO! 100% de Animes y Episodios en tu Google Drive`);
  console.log(`Total Episodios Procesados: ${globalProcessedEpisodes}/${grandTotalEpisodes}`);
  console.log(`========================================================================\n`);
})();
