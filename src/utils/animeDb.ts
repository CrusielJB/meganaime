import { Anime, Episode } from "../types";

/**
 * CATALOG LOADING STRATEGY:
 * - Server (Node.js): Reads catalog.json from disk — NOT bundled into the JS bundle
 * - Client (Browser): Returns empty array — data comes from /api/home endpoint
 * This keeps the frontend bundle small (~350KB) while the server has the full 4,503-title catalog.
 */

const IS_BROWSER = typeof window !== "undefined";

let _catalog: Anime[] | null = null;

function loadCatalog(): Anime[] {
  if (_catalog !== null) return _catalog;
  if (IS_BROWSER) {
    _catalog = [];
    return _catalog;
  }
  // Server-side: load from JSON file via fs.readFileSync — NOT bundled by esbuild
  try {
    const fs = require("fs");
    const path = require("path");
    // Try alongside server.cjs in dist/ first (production)
    const candidates = [
      path.join(__dirname, "catalog.json"),
      path.join(process.cwd(), "dist", "catalog.json"),
      path.join(process.cwd(), "src", "data", "catalog.json")
    ];
    for (const p of candidates) {
      try {
        _catalog = JSON.parse(fs.readFileSync(p, "utf-8"));
        if (Array.isArray(_catalog) && _catalog.length > 0) {
          console.log(`Catalog loaded: ${_catalog.length} titles from ${p}`);
          return _catalog!;
        }
      } catch (e) {}
    }
    throw new Error("catalog.json not found in any candidate path");
  } catch (e) {
    console.warn("Could not load catalog.json:", e);
    _catalog = [];
  }
  return _catalog!;
}

// MOCK_ANIMES is empty in the bundle — full catalog loaded at runtime on server
export const MOCK_ANIMES: Anime[] = [];

// Helper to calculate available episode count for airing animes
export function getAvailableEpisodesCountForAiring(anime: Anime): number {
  if (anime.airedEpisodesCount !== undefined && anime.airedEpisodesCount > 0) {
    return anime.airedEpisodesCount;
  }
  if (anime.id === "one-piece") return 1115;
  if (anime.id === "mushoku-tensei-3") {
    const start = new Date("2026-07-04T08:00:00-04:00");
    const diff = Date.now() - start.getTime();
    if (diff < 0) return 2;
    const weeks = Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
    return Math.min(2 + weeks, 24);
  }
  if (anime.id === "youjo-senki-2") {
    const start = new Date("2026-07-08T08:00:00-04:00");
    const diff = Date.now() - start.getTime();
    if (diff < 0) return 1;
    const weeks = Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
    return Math.min(1 + weeks, 12);
  }
  if (anime.id === "that-time-i-got-reincarnated-as-a-slime-4") {
    const start = new Date("2026-04-03T08:00:00-04:00");
    const diff = Date.now() - start.getTime();
    if (diff < 0) return 1;
    const weeks = Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
    return Math.min(1 + weeks, 24);
  }
  return Math.min(5, anime.episodesCount || 5);
}

export function getAnimesWithEpisodes(): Anime[] {
  const catalog = loadCatalog();
  if (catalog.length === 0) return [];

  return catalog.map((anime: Anime) => {
    const isMovie = anime.type === "Película";
    const isOVA = anime.type === "OVA";
    const episodesCount = isMovie ? 1 : isOVA ? 1 : (anime.episodesCount || 12);

    let availableCount = episodesCount;
    if (anime.status === "En emisión") {
      availableCount = getAvailableEpisodesCountForAiring(anime);
    }

    const episodes: Episode[] = Array.from({ length: availableCount }, (_, i) => ({
      id: `${anime.id}-ep-${i + 1}`,
      title: isMovie
        ? anime.title
        : isOVA
          ? `${anime.title} - OVA ${i + 1}`
          : `${anime.title} - Episodio ${i + 1}`,
      number: i + 1,
      animeId: anime.id,
      animeTitle: anime.title,
      coverUrl: anime.coverUrl,
      videoUrl: `/api/episode/${anime.id}-ep-${i + 1}`,
      releaseDate: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toLocaleDateString("es-ES")
    }));

    return {
      ...anime,
      episodesCount: anime.status === "En emisión"
        ? episodes.length
        : anime.episodesCount,
      episodes
    };
  });
}

export function generateMockRecentEpisodes(animes: Anime[]): Episode[] {
  const episodes: Episode[] = [];
  const recent = animes.slice(0, 20);
  for (const anime of recent) {
    const epNum = anime.episodesCount || 1;
    episodes.push({
      id: `${anime.id}-ep-${epNum}`,
      title: anime.type === "Película"
        ? anime.title
        : `${anime.title} - Episodio ${epNum}`,
      number: epNum,
      animeId: anime.id,
      animeTitle: anime.title,
      coverUrl: anime.coverUrl,
      videoUrl: `/api/episode/${anime.id}-ep-${epNum}`,
      releaseDate: "Hoy"
    });
  }
  return episodes;
}

export function getBaseTitle(title: string): string {
  if (!title) return "";
  const baseLower = title.toLowerCase().trim();
  if (baseLower.includes("that time i got reincarnated as a slime") || baseLower.includes("tensei shitara slime datta ken")) {
    return "That Time I Got Reincarnated as a Slime";
  }
  if (baseLower.includes("demon slayer") || baseLower.includes("kimetsu no yaiba")) return "Kimetsu no Yaiba";
  if (baseLower.includes("attack on titan") || baseLower.includes("shingeki no kyojin")) return "Shingeki no Kyojin";
  if (baseLower.includes("jujutsu kaisen")) return "Jujutsu Kaisen";
  if (baseLower.includes("chainsaw man")) return "Chainsaw Man";
  if (baseLower.includes("my hero academia") || baseLower.includes("boku no hero academia")) return "Boku no Hero Academia";
  if (baseLower.includes("solo leveling")) return "Solo Leveling";
  if (baseLower.includes("one piece")) return "One Piece";

  let base = title;
  base = base.replace(/\s+Temporada\s+\d+/gi, "");
  base = base.replace(/\s+Season\s+\d+/gi, "");
  base = base.replace(/\s+Part\s+\d+/gi, "");
  base = base.replace(/\s+Parte\s+\d+/gi, "");
  base = base.replace(/\s+\d+(nd|rd|th|st)\s+Season/gi, "");
  base = base.replace(/\s+\(TV\)/gi, "");
  base = base.replace(/\s*:\s*$/, "");
  return base.trim();
}

export function groupAnimeSeasons(animes: Anime[]): Anime[] {
  if (!animes || animes.length === 0) return [];
  const groups: Record<string, Anime[]> = {};
  for (const anime of animes) {
    const base = getBaseTitle(anime.title).toLowerCase().trim();
    if (!groups[base]) groups[base] = [];
    groups[base].push(anime);
  }
  const result: Anime[] = [];
  for (const baseKey of Object.keys(groups)) {
    const group = groups[baseKey];
    group.sort((a, b) => {
      const getSN = (t: string) => {
        const m = t.match(/Season\s+(\d+)/i) || t.match(/Temporada\s+(\d+)/i);
        return m ? parseInt(m[1], 10) : 1;
      };
      const diff = getSN(a.title) - getSN(b.title);
      return diff !== 0 ? diff : a.year - b.year;
    });
    const rep = { ...group[0] };
    if (group.length > 1) rep.seasons = group;
    result.push(rep);
  }
  return result;
}

export function getAiringBaseCount(animeId: string, fallbackCount: number = 12): number {
  if (animeId.includes("mushoku-tensei-3")) return 6;
  if (animeId.includes("one-piece")) return 1172;
  if (animeId.includes("youjo-senki-2")) return 5;
  if (animeId.includes("slime-4")) return 16;
  return Math.min(5, fallbackCount);
}
