/**
 * MEGAANIME — FASE 2: Descarga Masiva por Orden de Fama Mundial
 * Descarga todos los animes del catálogo ordenados por popularidad mundial.
 * Primero los más famosos, luego el resto por rating descendente.
 * Incluye películas. Omite episodios ya descargados (>20MB en Drive).
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { spawn, execSync } = require("child_process");

const MANIFEST_FILE = path.join(process.cwd(), "src/data/drive_episodes.json");
const CATALOG_FILE  = path.join(process.cwd(), "src/data/catalog.json");
const distManifest  = path.join(process.cwd(), "dist/drive_episodes.json");

// Popularidad mundial real — los más famosos primero
const WORLD_FAMOUS_KEYWORDS = [
  "fullmetal alchemist: brotherhood", "fullmetal alchemist brotherhood",
  "shingeki no kyojin: the final season part 3", "shingeki no kyojin: the final season part 2",
  "shingeki no kyojin: the final season", "shingeki no kyojin season 3",
  "shingeki no kyojin season 2", "shingeki no kyojin",
  "attack on titan", "death note", "steins;gate", "steins gate",
  "hunter x hunter (2011)", "hunter x hunter",
  "kimetsu no yaiba: mugen train", "kimetsu no yaiba",
  "demon slayer", "jujutsu kaisen", "kaguya-sama",
  "violet evergarden", "cowboy bebop", "code geass",
  "neon genesis evangelion", "evangelion",
  "your name", "kimi no na wa", "a silent voice", "koe no katachi",
  "spirited away", "mononoke", "howl",
  "berserk", "one punch man", "mob psycho", "vinland saga",
  "made in abyss", "re:zero", "rezero", "no game no life",
  "toradora", "clannad", "anohana", "your lie in april",
  "shigatsu wa kimi no uso", "haikyuu", "kuroko no basket",
  "sword art online", "naruto shippuden", "naruto",
  "dragon ball z", "dragon ball super", "dragon ball",
  "bleach", "fairy tail", "black clover",
  "my hero academia", "boku no hero academia",
  "overlord", "date a live", "danmachi", "konosuba",
  "tensei shitara slime", "tensura", "chainsaw man",
  "spy x family", "oshi no ko", "tokyo ghoul", "parasyte",
  "elfen lied", "angel beats", "black lagoon", "hellsing",
  "fullmetal alchemist", "fate/zero", "fate/stay night", "fate",
  "soul eater", "ouran", "cardcaptor sakura", "sailor moon",
  "inuyasha", "samurai champloo", "trigun", "gurren lagann",
  "psycho-pass", "log horizon", "akame ga kill", "tokyo revengers",
  "dr. stone", "yakusoku no neverland", "promised neverland",
  "blue lock", "dandadan", "dungeon meshi", "delicious in dungeon",
  "sousou no frieren", "frieren", "mushoku tensei", "sakamoto days",
];

function sanitizeFolderName(name) {
  return name.replace(/[<>:"/\\|?*]/g, "_").trim();
}
function normalize(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
function getSeasonHierarchy(rawTitle) {
  let title = rawTitle.trim();
  let baseTitle = title;
  let seasonSubfolder = "";
  if (/(?:4th\s+Season|Temporada\s+4|Season\s+4|Parte\s+4|\bIV\b)/i.test(title)) {
    seasonSubfolder = "4ta Temporada";
    baseTitle = title.replace(/\s*[-:]?\s*(?:4th\s+Season|Temporada\s+4|Season\s+4|Parte\s+4|\bIV\b)[\s\S]*/i, "").trim();
  } else if (/(?:3rd\s+Season|Temporada\s+3|Season\s+3|Parte\s+3|\bIII\b)/i.test(title)) {
    seasonSubfolder = "3ra Temporada";
    baseTitle = title.replace(/\s*[-:]?\s*(?:3rd\s+Season|Temporada\s+3|Season\s+3|Parte\s+3|\bIII\b)[\s\S]*/i, "").trim();
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
function renderProgressBar(percent, length = 22) {
  const p = Math.max(0, Math.min(100, percent));
  const filled = Math.round((p / 100) * length);
  const empty = length - filled;
  return "[" + "\u2588".repeat(filled) + "\u2591".repeat(empty) + "] " + p.toFixed(1) + "%";
}
function unpackPacker(packedCode) {
  try {
    const match = packedCode.match(/eval\(function\(p,a,c,k,e,d\)\{.*?\}\('([\s\S]*?)',(\d+),(\d+),'([\s\S]*?)'\.split\('\|'\)/);
    if (!match) return packedCode;
    const payload = match[1]; const radix = parseInt(match[2], 10);
    const symtab = match[4].split("|");
    const digits = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lookup = (word) => {
      let val = 0;
      for (let i = 0; i < word.length; i++) val = val * radix + digits.indexOf(word[i]);
      return val < symtab.length && symtab[val] ? symtab[val] : word;
    };
    return payload.replace(/\b\w+\b/g, lookup);
  } catch (e) { return packedCode; }
}

async function resolveDirectVideoUrl(serverName, serverUrl) {
  try {
    const sUrl = (serverUrl || "").toLowerCase();
    const sName = (serverName || "").toLowerCase();
    if (sUrl.includes("voe.sx") || sName.includes("voe")) {
      const res = await fetch(serverUrl, { headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://tioanime.com/" }, signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const html = await res.text();
        const m = html.match(/'hls'\s*:\s*'(https?:\/\/[^']+\.m3u8[^']*)'/i) || html.match(/"hls"\s*:\s*"(https?:\/\/[^"]+\.m3u8[^"]*)"/i) || html.match(/file\s*:\s*['\"](https?:\/\/[^'\"]+\.m3u8[^'\"]*)['\"]/) || html.match(/(https?:\/\/[^"'`\s\\]+\.m3u8\b[^"'`\s]*)/i);
        if (m) return { url: m[1], isHls: true, referer: serverUrl };
      }
    }
    if (sUrl.includes("mp4upload") || sName.includes("mp4upload")) {
      const res = await fetch(serverUrl, { headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://www.mp4upload.com/" }, signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const raw = await res.text(); const html = unpackPacker(raw) + "\n" + raw;
        const m = html.match(/src\s*:\s*["'](https?:\/\/[^"']+\.mp4[^"']*)/i) || html.match(/(https?:\/\/[^"'`\s\\]+\.mp4\b[^"'`\s]*)/i);
        if (m) return { url: m[1], isHls: false, referer: "https://www.mp4upload.com/" };
      }
    }
    if (sUrl.includes("yourupload") || sName.includes("yourupload")) {
      const res = await fetch(serverUrl, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const html = await res.text();
        const m = html.match(/file\s*:\s*["'](https?:\/\/[^"']+\.mp4[^"']*)/i) || html.match(/(https?:\/\/[^"'`\s\\]+\.mp4\b[^"'`\s]*)/i);
        if (m) return { url: m[1], isHls: false, referer: serverUrl };
      }
    }
    if (sUrl.includes("filemoon") || sName.includes("filemoon")) {
      const res = await fetch(serverUrl, { headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://tioanime.com/" }, signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const raw = await res.text(); const html = unpackPacker(raw) + "\n" + raw;
        const m = html.match(/file\s*:\s*["'](https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)/i) || html.match(/(https?:\/\/[^"'`\s\\]+\.m3u8\b[^"'`\s]*)/i) || html.match(/(https?:\/\/[^"'`\s\\]+\.mp4\b[^"'`\s]*)/i);
        if (m) return { url: m[1], isHls: m[1].includes(".m3u8"), referer: serverUrl };
      }
    }
    if (sUrl.includes("wish") || sName.includes("wish") || sUrl.includes("streamwish")) {
      const res = await fetch(serverUrl, { headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://tioanime.com/" }, signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const raw = await res.text(); const html = unpackPacker(raw) + "\n" + raw;
        const m = html.match(/file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)/i) || html.match(/(https?:\/\/[^"'`\s\\]+\.m3u8\b[^"'`\s]*)/i);
        if (m) return { url: m[1], isHls: true, referer: serverUrl };
      }
    }
    if (sUrl.includes("mixdrop") || sName.includes("mixdrop")) {
      const res = await fetch(serverUrl, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const raw = await res.text(); const html = unpackPacker(raw) + "\n" + raw;
        const m = html.match(/MDCore\.wurl\s*=\s*["'](https?:\/\/[^"']+)/i) || html.match(/["'](https?:\/\/s[0-9]+\.mixdrop\.co\/[^"']+)/i);
        if (m) return { url: m[1], isHls: false, referer: serverUrl };
      }
    }
    if (serverUrl.includes("megaanime") || serverUrl.includes("drive.google.com")) {
      return { url: serverUrl, isHls: false };
    }
    return null;
  } catch (err) { return null; }
}

async function streamToGoogleDrive(videoUrl, remotePath, referer, onProgress) {
  return new Promise((resolve, reject) => {
    const isHttps = videoUrl.startsWith("https:");
    const client = isHttps ? https : http;
    const rclone = spawn("rclone", ["rcat", remotePath], { stdio: ["pipe", "ignore", "pipe"] });
    rclone.stdin.on("error", () => {});
    let rcloneStderr = "";
    rclone.stderr.on("data", (chunk) => { rcloneStderr += chunk.toString(); });
    let totalBytes = 0, downloadedBytes = 0, isFinished = false;
    function finish(err) {
      if (isFinished) return; isFinished = true;
      try { r && r.unpipe && r.unpipe(rclone.stdin); } catch(e) {}
      err ? reject(err) : resolve();
    }
    rclone.on("close", (code) => { code === 0 ? finish(null) : finish(new Error("rclone error " + code + ": " + rcloneStderr.trim())); });
    rclone.on("error", finish);
    const headers = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36", "Referer": referer || "https://tioanime.com/", "Accept": "*/*", "Connection": "keep-alive" };
    let r;
    const req = client.get(videoUrl, { headers }, (res) => {
      r = res;
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirect = res.headers.location;
        if (!redirect.startsWith("http")) { const u = new URL(videoUrl); redirect = u.protocol + "//" + u.host + redirect; }
        return streamToGoogleDrive(redirect, remotePath, referer, onProgress).then(resolve).catch(finish);
      }
      if (res.statusCode !== 200 && res.statusCode !== 206) { try { rclone.stdin.end(); } catch(e) {} return finish(new Error("HTTP " + res.statusCode)); }
      totalBytes = parseInt(res.headers["content-length"] || "0", 10);
      res.on("data", (chunk) => {
        downloadedBytes += chunk.length;
        if (onProgress && totalBytes > 0) onProgress((downloadedBytes / totalBytes) * 100, (downloadedBytes / 1048576).toFixed(1), (totalBytes / 1048576).toFixed(1));
      });
      res.pipe(rclone.stdin);
      res.on("error", (err) => { try { rclone.stdin.end(); } catch(e) {} finish(err); });
    });
    req.on("error", (err) => { try { rclone.stdin.end(); } catch(e) {} finish(err); });
    req.setTimeout(25000, () => { try { rclone.stdin.end(); } catch(e) {} req.destroy(new Error("Timeout")); });
  });
}

function getPopularityRank(anime) {
  const titleLower = (anime.title || "").toLowerCase();
  const idLower    = (anime.id    || "").toLowerCase();
  for (let i = 0; i < WORLD_FAMOUS_KEYWORDS.length; i++) {
    const kw = WORLD_FAMOUS_KEYWORDS[i];
    if (titleLower.includes(kw) || idLower.includes(kw.replace(/[^a-z0-9]/g, ""))) return i;
  }
  return 9999 + Math.round((10 - Math.min(10, anime.rating || 0)) * 100);
}

(async () => {
  console.log("\n========================================================================");
  console.log("MEGAANIME FASE 2 — DESCARGA MASIVA POR FAMA MUNDIAL");
  console.log("Analizando Drive para no repetir episodios ya descargados...");
  console.log("========================================================================\n");

  const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, "utf-8"));
  let driveData = fs.existsSync(MANIFEST_FILE) ? JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf-8")) : {};

  console.log("Consultando Google Drive...");
  let files = [];
  try {
    const rcloneList = execSync('rclone lsjson -R --files-only "gdrive:MegaAnime_HD" 2>/dev/null', { encoding: "utf-8", maxBuffer: 60 * 1024 * 1024 });
    files = JSON.parse(rcloneList);
    console.log("Drive inventario: " + files.length + " archivos.\n");
  } catch (err) { console.error("Error leyendo Drive:", err.message); process.exit(1); }

  const driveFilesByFolder = {};
  files.forEach(f => {
    const parts = f.Path.split("/"); const folder = parts[0]; const filename = parts[parts.length - 1];
    if (!driveFilesByFolder[folder]) driveFilesByFolder[folder] = [];
    driveFilesByFolder[folder].push({ filename, path: f.Path, size: f.Size, id: f.ID });
  });

  catalog.sort((a, b) => getPopularityRank(a) - getPopularityRank(b));

  const pendingQueue = [];
  let totalComplete = 0;

  for (const anime of catalog) {
    const isMovie = (anime.type || "").toLowerCase().includes("pel") || (anime.type || "").toLowerCase().includes("movie");
    const targetEps = isMovie ? 1 : (anime.airedEpisodesCount || anime.episodesCount || (anime.episodes ? anime.episodes.length : 0));
    if (!targetEps || targetEps < 1) continue;

    const normTitle = normalize(anime.title);
    const normId    = normalize(anime.id.replace(/^tioanime-/, ""));
    let matchedFiles = []; let matchedFolder = "";
    for (const folder of Object.keys(driveFilesByFolder)) {
      const normFolder = normalize(folder);
      if (normFolder === normTitle || normFolder === normId || (normTitle.length > 5 && normFolder.includes(normTitle)) || (normFolder.length > 5 && normTitle.includes(normFolder))) {
        matchedFolder = folder; matchedFiles.push(...driveFilesByFolder[folder]);
      }
    }

    const existingEpisodesMap = new Map();
    matchedFiles.forEach(f => {
      if (!f.size || f.size < 20 * 1024 * 1024) return;
      const m = f.filename.match(/Episodio\s*(\d+)/i) || f.filename.match(/_(\d+)\.mp4$/i) || f.filename.match(/-(\d+)\.mp4$/i) || f.filename.match(/\b(\d+)\.mp4$/i);
      if (m) existingEpisodesMap.set(parseInt(m[1]), f);
    });

    if (!driveData[anime.id]) driveData[anime.id] = { title: anime.title, episodes: {} };
    existingEpisodesMap.forEach((fileObj, epNum) => {
      driveData[anime.id].episodes["ep-" + epNum] = { fileId: fileObj.id, streamUrl: fileObj.id ? "https://drive.google.com/file/d/" + fileObj.id + "/preview" : null, gdrivePath: fileObj.path, filename: fileObj.filename, sizeMB: (fileObj.size / 1048576).toFixed(2), uploadedAt: new Date().toISOString() };
    });

    const missingEps = [];
    for (let ep = 1; ep <= targetEps; ep++) { if (!existingEpisodesMap.has(ep)) missingEps.push(ep); }
    if (missingEps.length === 0) { totalComplete++; } else { pendingQueue.push({ anime, targetEps, missingEps, matchedFolder: matchedFolder || getSeasonHierarchy(anime.title).mainFolder }); }
  }

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(driveData, null, 2), "utf-8");
  if (fs.existsSync(path.dirname(distManifest))) fs.writeFileSync(distManifest, JSON.stringify(driveData, null, 2), "utf-8");

  console.log("========================================================================");
  console.log("ANALISIS COMPLETADO:");
  console.log("Completos en Drive: " + totalComplete);
  console.log("Pendientes: " + pendingQueue.length + " animes");
  console.log("========================================================================\n");

  if (pendingQueue.length === 0) { console.log("TODO EL CATALOGO ESTA COMPLETO EN GOOGLE DRIVE!"); return; }

  console.log("COLA (top 30 por fama):");
  pendingQueue.slice(0, 30).forEach((item, idx) => {
    console.log("  " + (idx + 1) + '. "' + item.anime.title + '" -> ' + item.missingEps.length + " ep(s) pendientes");
  });
  if (pendingQueue.length > 30) console.log("  ... y " + (pendingQueue.length - 30) + " animes mas");
  console.log("------------------------------------------------------------------------\n");

  for (let i = 0; i < pendingQueue.length; i++) {
    const item = pendingQueue[i];
    const { anime, missingEps, targetEps, matchedFolder } = item;
    const { seasonFolder } = getSeasonHierarchy(anime.title);
    const remoteDir = seasonFolder ? "gdrive:MegaAnime_HD/" + matchedFolder + "/" + seasonFolder : "gdrive:MegaAnime_HD/" + matchedFolder;

    console.log("\n[" + (i + 1) + "/" + pendingQueue.length + '] "' + anime.title + '"');
    console.log("Drive: MegaAnime_HD/" + matchedFolder + (seasonFolder ? "/" + seasonFolder : ""));
    console.log("Pendientes (" + missingEps.length + "): [" + missingEps.slice(0, 10).join(", ") + (missingEps.length > 10 ? "..." : "") + "]");

    for (const ep of missingEps) {
      const filename = sanitizeFolderName(anime.title) + " - Episodio " + String(ep).padStart(2, "0") + ".mp4";
      const remoteFilePath = remoteDir + "/" + filename;
      console.log("\n   [Ep " + ep + "/" + targetEps + "] Resolviendo servidor 1080p...");
      try {
        const episodeId = anime.id + "-ep-" + ep;
        let epData = null;
        for (const epApiUrl of ["https://megaanime-1c250.web.app/api/episode/" + encodeURIComponent(episodeId), "https://megaanime.net/api/episode/" + encodeURIComponent(episodeId)]) {
          try {
            const apiRes = await fetch(epApiUrl, { headers: { "User-Agent": "MegaAnime-Pipeline/2.0" }, signal: AbortSignal.timeout(15000) });
            if (apiRes.ok) { epData = await apiRes.json(); break; }
          } catch(e) {}
        }
        if (!epData || !epData.videoServers || epData.videoServers.length === 0) { console.warn("   No hay servidor para ep " + ep + "."); continue; }
        let streamSuccess = false;
        for (const server of epData.videoServers) {
          const resolved = await resolveDirectVideoUrl(server.name, server.url);
          if (resolved && resolved.url && !resolved.isHls) {
            console.log("   Enlace 1080p OK desde " + server.name + "! Descargando a Drive...");
            try {
              const referer = resolved.url.includes("mp4upload") ? "https://www.mp4upload.com/" : (server.url || "https://tioanime.com/");
              await streamToGoogleDrive(resolved.url, remoteFilePath, referer, (percent, currMB, totalMB) => {
                process.stdout.write("\r   [Ep " + ep + "/" + targetEps + "] " + renderProgressBar(percent, 20) + " (" + currMB + "/" + totalMB + "MB) ");
              });
              let fileId = null; let sizeMB = null;
              try { const info = JSON.parse(execSync('rclone lsjson "' + remoteFilePath + '" 2>/dev/null', { encoding: "utf-8" }))[0]; if (info && info.ID) fileId = info.ID; if (info && info.Size) sizeMB = (info.Size / 1048576).toFixed(2); } catch(e) {}
              if (!sizeMB || parseFloat(sizeMB) < 20) { console.warn("\n   Archivo invalido (" + sizeMB + " MB), descartando..."); try { execSync('rclone deletefile "' + remoteFilePath + '" 2>/dev/null'); } catch(e) {} continue; }
              console.log("\n   [Ep " + ep + "/" + targetEps + "] Guardado en Drive! (" + sizeMB + " MB)");
              if (!driveData[anime.id]) driveData[anime.id] = { title: anime.title, episodes: {} };
              driveData[anime.id].episodes["ep-" + ep] = { fileId, streamUrl: fileId ? "https://drive.google.com/file/d/" + fileId + "/preview" : null, gdrivePath: remoteFilePath.replace("gdrive:MegaAnime_HD/", ""), filename, sizeMB, uploadedAt: new Date().toISOString() };
              fs.writeFileSync(MANIFEST_FILE, JSON.stringify(driveData, null, 2), "utf-8");
              if (fs.existsSync(path.dirname(distManifest))) fs.writeFileSync(distManifest, JSON.stringify(driveData, null, 2), "utf-8");
              streamSuccess = true; break;
            } catch (streamErr) { console.warn("\n   Error desde " + server.name + ": " + streamErr.message); try { execSync('rclone deletefile --max-size 10M "' + remoteFilePath + '" 2>/dev/null'); } catch(e) {} }
          }
        }
        if (!streamSuccess) console.warn("   Sin servidor MP4 directo para ep " + ep + ". Continuando...");
      } catch (err) { console.error("   Error en ep " + ep + ":", err.message); }
    }
    if ((i + 1) % 10 === 0) console.log("\nPROGRESO: " + (i + 1) + "/" + pendingQueue.length + " animes procesados.\n");
  }

  console.log("\n========================================================================");
  console.log("FASE 2 COMPLETADA! Todo el catalogo procesado.");
  console.log("========================================================================\n");
})();
