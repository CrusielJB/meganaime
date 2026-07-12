import { doc, setDoc, getDoc, query, collection, where, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { User } from "../types";
import { safeLocalStorage } from "./safeStorage";
import { getAnimesWithEpisodes, getBaseTitle } from "./animeDb";

/**
 * Generates a stable, canonical episode key for cross-API matching.
 * Format: "<normalizedAnimeId>_ep_<episodeNumber>"
 * This allows progress saved from any API (HiAnime, Consumet, MonosChinos...)
 * to be matched against episode lists from any other API or local DB.
 */
export function getCanonicalEpisodeKey(normalizedAnimeId: string, episodeNumber: number | string): string {
  const num = typeof episodeNumber === "string" ? parseInt(episodeNumber, 10) || 1 : episodeNumber;
  return `${normalizedAnimeId}_ep_${num}`;
}

export interface PlaybackProgress {
  animeId: string;
  episodeId: string;
  episodeNumber: number;
  progressSeconds: number;
  durationSeconds: number;
  percentage: number;
  updatedAt: string;
  contentType?: "anime" | "manga" | "movie";
  animeTitle?: string;
  animeCoverUrl?: string;
}

// Memory cache to debounce / throttle firestore writes
const lastSaveTime: Record<string, number> = {};

/**
 * Normalizes an anime ID to its canonical stable ID.
 *
 * Matching cascade (in priority order):
 * 1. consumet-/hianime- prefix → look up by external_id in local catalog
 * 2. Title exact match → any of title / title_english / title_romaji / title_native
 * 3. getBaseTitle() cross-language normalization (handles "Attack on Titan" ↔ "Shingeki no Kyojin",
 *    "Demon Slayer" ↔ "Kimetsu no Yaiba", etc.)
 * 4. MonosChinos/AnimeFLV slug → strip episode suffix to get anime slug
 * 5. No match → return original ID (external animes still track consistently)
 */
export function normalizeAnimeId(animeId: string, animeTitle?: string): string {
  if (!animeId) return animeId;

  // Helper: find a local catalog entry by title with multi-language support
  const findByTitle = (title: string): string | null => {
    if (!title) return null;
    const lower = title.toLowerCase().trim();
    const baseLower = getBaseTitle(title).toLowerCase().trim();
    try {
      const localAnimes = getAnimesWithEpisodes();
      for (const a of localAnimes as any[]) {
        const candidates: string[] = [
          a.title, a.title_english, a.title_romaji, a.title_native
        ].filter(Boolean);

        // Exact title match
        if (candidates.some((t: string) => t.toLowerCase().trim() === lower)) {
          return a.id;
        }

        // getBaseTitle-normalized match (catches cross-language variants)
        const aBase = getBaseTitle(a.title).toLowerCase().trim();
        if (
          (baseLower && baseLower === aBase) ||
          candidates.some((t: string) => getBaseTitle(t).toLowerCase().trim() === baseLower)
        ) {
          return a.id;
        }
      }
    } catch (e) {}
    return null;
  };

  // --- Step 1: consumet- and hianime- prefixed IDs ---
  if (animeId.startsWith("consumet-") || animeId.startsWith("hianime-")) {
    // Strip episode suffix (e.g. consumet-21-ep-123 → consumet-21)
    const withoutEp = animeId.replace(/-ep-\d+$/, "").replace(/-\d+$/, "");
    const externalId = withoutEp.replace(/^(consumet-|hianime-)/, "");

    try {
      const localAnimes = getAnimesWithEpisodes();
      // Match by external_id field (most reliable)
      const byExtId = (localAnimes as any[]).find(
        (a: any) => a.external_id && a.external_id === externalId
      );
      if (byExtId) return byExtId.id;
    } catch (e) {}

    // Fallback: match by anime title if available
    if (animeTitle) {
      const byTitle = findByTitle(animeTitle);
      if (byTitle) return byTitle;
    }

    // No local catalog match — return the stable prefix-only ID
    return withoutEp;
  }

  // --- Step 2: Match by animeTitle when provided (works for all APIs) ---
  if (animeTitle) {
    const byTitle = findByTitle(animeTitle);
    if (byTitle) return byTitle;
  }

  // --- Step 3: MonosChinos / AnimeFLV episode slug patterns ---
  // e.g. "naruto-shippuden-episodio-500", "one-piece-cap-1115", "bleach-ep-366"
  const episodeSuffixPattern = /-(episodio|capitulo|cap|ep|e)-?\d+$/i;
  if (episodeSuffixPattern.test(animeId)) {
    const animeSlug = animeId.replace(episodeSuffixPattern, "");
    try {
      const localAnimes = getAnimesWithEpisodes();
      const exact = (localAnimes as any[]).find((a: any) => a.id === animeSlug);
      if (exact) return exact.id;
    } catch (e) {}
    return animeSlug;
  }

  // --- Step 4: Plain numeric trailing suffix (e.g. "one-piece-1115") ---
  const trailingNumberPattern = /-\d+$/;
  if (trailingNumberPattern.test(animeId)) {
    const candidateSlug = animeId.replace(trailingNumberPattern, "");
    try {
      const localAnimes = getAnimesWithEpisodes();
      const exact = (localAnimes as any[]).find((a: any) => a.id === candidateSlug);
      if (exact) return exact.id;
    } catch (e) {}
    // Don't strip if we can't confirm it's an episode suffix
  }

  // --- Step 5: Already a stable ID ---
  return animeId;
}

/**
 * Saves the playback progress for a specific episode.
 * Saves to localStorage immediately, and to Firestore (throttled every 5 seconds or if forced).
 */
export async function saveEpisodeProgress(
  animeId: string,
  episodeId: string,
  episodeNumber: number,
  progressSeconds: number,
  durationSeconds: number,
  currentUser: User | null,
  forceFirestore: boolean = false,
  contentType: "anime" | "manga" | "movie" = "anime",
  animeTitle?: string,
  animeCoverUrl?: string
) {
  if (!animeId || !episodeId || durationSeconds <= 0) return;

  // Normalize external IDs (e.g. consumet-21 → one-piece) before storing
  const normalizedAnimeId = normalizeAnimeId(animeId, animeTitle);

  // Note: percentage and isFinished will be calculated AFTER the no-regression rule below
  const profileId = currentUser?.activeProfileId || "default";
  const cacheKey = currentUser ? `megaAnime_progress_${currentUser.id}_${profileId}` : "megaAnime_progress_guest";
  
  let mergedTitle = animeTitle;
  let mergedCover = animeCoverUrl;

  // Clean generic API titles
  if (mergedTitle) {
    const lower = mergedTitle.toLowerCase().trim();
    if (
      lower === "consumet" || lower === "hianime" || lower === "undefined" ||
      lower === "" || lower === "null" ||
      lower.startsWith("consumet-") || lower.startsWith("hianime-")
    ) {
      mergedTitle = undefined;
    }
  }

  // 1. Resolve from local catalog first for high quality data
  try {
    const localAnimes = getAnimesWithEpisodes();
    const match = localAnimes.find(a =>
      a.id === normalizedAnimeId ||
      (a.external_id && a.external_id === normalizedAnimeId.replace(/^(consumet-|hianime-)/, ""))
    );
    if (match) {
      if (!mergedTitle) mergedTitle = match.title;
      if (!mergedCover) mergedCover = match.coverUrl;
    }
  } catch (e) {}

  // 2. Read existing from LocalStorage first to merge metadata if missing
  let existing: Record<string, PlaybackProgress> = {};
  try {
    const existingRaw = safeLocalStorage.getItem(cacheKey);
    if (existingRaw) {
      existing = JSON.parse(existingRaw);
      const prev = existing[normalizedAnimeId];
      if (prev) {
        // If incoming title/cover is missing or generic, merge previous good metadata
        const prevTitleBad = !prev.animeTitle || prev.animeTitle.toLowerCase() === "consumet" || prev.animeTitle.toLowerCase() === "hianime";
        if (!prevTitleBad) {
          if (!mergedTitle || mergedTitle.toLowerCase() === "consumet" || mergedTitle.toLowerCase() === "hianime") {
            mergedTitle = prev.animeTitle;
          }
        }
        if (!mergedCover && prev.animeCoverUrl) mergedCover = prev.animeCoverUrl;

        // NO-REGRESSION RULE: Don't overwrite a higher progress with a much lower one.
        // This prevents the initial 1-second save from overwriting real progress when
        // getLocalEpisodeProgress failed to find the saved entry (ID mismatch scenario).
        if (prev.episodeId === episodeId && prev.progressSeconds > progressSeconds + 30 && !forceFirestore) {
          progressSeconds = prev.progressSeconds;
          durationSeconds = Math.max(durationSeconds, prev.durationSeconds);
        }
      }
    }
  } catch (e) {}

  // Re-calculate percentage with potentially corrected values
  const finalPercentage = Math.min(100, Math.round((progressSeconds / durationSeconds) * 100));
  const isFinished = finalPercentage >= 90;

  // 2.5. Resolve metadata from AniList GraphQL if generic or missing
  const isTitleGeneric = !mergedTitle || 
    mergedTitle.toLowerCase().trim() === "consumet" || 
    mergedTitle.toLowerCase().trim() === "hianime" || 
    mergedTitle.toLowerCase().trim() === "undefined" ||
    /^\d+$/.test(mergedTitle.trim());

  if (isTitleGeneric || !mergedCover) {
    try {
      const resolveType = contentType === "manga" ? "MANGA" : "ANIME";
      const res = await fetch(`/api/resolve-cover?title=${encodeURIComponent(mergedTitle || "")}&animeId=${encodeURIComponent(normalizedAnimeId)}&type=${resolveType}`);
      if (res.ok) {
        const data = await res.json();
        if (data.title && isTitleGeneric) {
          mergedTitle = data.title;
        }
        if (data.coverUrl && !mergedCover) {
          mergedCover = data.coverUrl;
        }
      }
    } catch (e) {
      console.warn("Failed to resolve metadata in saveEpisodeProgress:", e);
    }
  }

  // Fallback: If still empty, clean up ID for display title instead of showing API names
  if (!mergedTitle || mergedTitle.toLowerCase() === "consumet" || mergedTitle.toLowerCase() === "hianime") {
    mergedTitle = normalizedAnimeId.replace(/^(consumet-|hianime-)/g, "").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }

  const progressData: PlaybackProgress = {
    animeId: normalizedAnimeId,
    episodeId,
    episodeNumber,
    progressSeconds,
    durationSeconds,
    percentage: finalPercentage,
    updatedAt: new Date().toISOString(),
    contentType,
    animeTitle: mergedTitle,
    animeCoverUrl: mergedCover
  };
  
  // 3. LocalStorage management (for continue watching list)
  try {
    if (isFinished) {
      delete existing[normalizedAnimeId];
    } else {
      existing[normalizedAnimeId] = progressData;
      
      // Limit to 15 items: Sort by updatedAt desc and keep top 15
      const sortedItems = Object.values(existing)
        .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 15) as PlaybackProgress[];
        
      const limitedMap: Record<string, PlaybackProgress> = {};
      sortedItems.forEach(item => {
        limitedMap[item.animeId] = item;
      });
      existing = limitedMap;
    }
    
    safeLocalStorage.setItem(cacheKey, JSON.stringify(existing));

    // ALSO SAVE TO THE INDIVIDUAL EPISODES MAP (History tracker for marking watched episodes)
    const episodesCacheKey = currentUser ? `megaAnime_episodes_progress_${currentUser.id}_${profileId}` : "megaAnime_episodes_progress_guest";
    const episodesRaw = safeLocalStorage.getItem(episodesCacheKey);
    const episodesMap = episodesRaw ? JSON.parse(episodesRaw) : {};
    
    // Canonical key: allows cross-API episode matching (e.g. hianime-ep-98765 → one-piece_ep_1115)
    const canonicalKey = getCanonicalEpisodeKey(normalizedAnimeId, episodeNumber);

    if (isFinished) {
      // Mark as 100% completed instead of deleting so the checkmark stays on the chapter list
      const finishedData = { ...progressData, progressSeconds: durationSeconds, percentage: 100 };
      episodesMap[episodeId] = finishedData;
      // Also store under the canonical key for cross-API lookup
      episodesMap[canonicalKey] = finishedData;
    } else {
      episodesMap[episodeId] = progressData;
      // Also store under the canonical key for cross-API lookup
      episodesMap[canonicalKey] = progressData;
    }
    safeLocalStorage.setItem(episodesCacheKey, JSON.stringify(episodesMap));
  } catch (err) {
    console.warn("Failed to write progress to localStorage:", err);
  }

  // 3. Firestore Sync (General progress & individual episode sync)
  if (currentUser) {
    const docId = `${currentUser.id}_${profileId}_${normalizedAnimeId}`.replace(/\//g, "_");
    const docRef = doc(db, "user_progress", docId);
    
    // Individual episode document for robust cloud history syncing
    const epDocId = `${currentUser.id}_${profileId}_${episodeId}`.replace(/\//g, "_");
    const epDocRef = doc(db, "episode_progress", epDocId);

    if (isFinished) {
      try {
        await deleteDoc(docRef);
        // Write 100% progress to episode progress so it stays checked in the cloud
        await setDoc(epDocRef, {
          userId: currentUser.id,
          profileId,
          ...progressData,
          progressSeconds: durationSeconds,
          percentage: 100
        }, { merge: true });
      } catch (err) {
        console.warn("Failed to update finished progress in Firestore:", err);
      }
    } else {
      const now = Date.now();
      const throttleKey = `${currentUser.id}_${profileId}_${normalizedAnimeId}`;
      const lastSaved = lastSaveTime[throttleKey] || 0;

      if (forceFirestore || now - lastSaved >= 10000) { // Changed to 10 seconds throttle as per Phase 3 plan
        lastSaveTime[throttleKey] = now;
        try {
          await setDoc(docRef, {
            userId: currentUser.id,
            profileId,
            ...progressData
          }, { merge: true });

          await setDoc(epDocRef, {
            userId: currentUser.id,
            profileId,
            ...progressData
          }, { merge: true });
        } catch (err) {
          console.warn("Failed to sync progress to Firestore:", err);
        }
      }
    }
  }
}

/**
 * Gets the playback progress for a specific anime from LocalStorage cache.
 * Pass animeTitle to get the SAME normalization used during saving (critical for cross-API matching).
 */
export function getLocalEpisodeProgress(animeId: string, currentUser: User | null, animeTitle?: string): PlaybackProgress | null {
  // IMPORTANT: Pass animeTitle so we get the same normalizedId as during save.
  // Without it, 'consumet-21' normalizes differently when title 'Mushoku Tensei' is known.
  const normalizedId = normalizeAnimeId(animeId, animeTitle);
  const profileId = currentUser?.activeProfileId || "default";
  const cacheKey = currentUser ? `megaAnime_progress_${currentUser.id}_${profileId}` : "megaAnime_progress_guest";
  
  try {
    const existingRaw = safeLocalStorage.getItem(cacheKey);
    if (!existingRaw) return null;
    const existing = JSON.parse(existingRaw);
    // Try normalized ID first, then fall back to raw ID
    return existing[normalizedId] || existing[animeId] || null;
  } catch (err) {
    console.warn("Failed to read local progress:", err);
    return null;
  }
}

/**
 * Fetches the playback progress for a specific anime from Firestore (to sync devices/browsers).
 * Updates LocalStorage if found. Pass animeTitle for consistent ID normalization.
 */
export async function syncEpisodeProgress(animeId: string, currentUser: User | null, animeTitle?: string): Promise<PlaybackProgress | null> {
  const normalizedId = normalizeAnimeId(animeId, animeTitle);
  // Check LocalStorage cache first with consistent normalization
  const local = getLocalEpisodeProgress(animeId, currentUser, animeTitle);
  
  if (!currentUser) return local;

  try {
    const profileId = currentUser.activeProfileId || "default";
    const docId = `${currentUser.id}_${profileId}_${normalizedId}`.replace(/\//g, "_");
    const docRef = doc(db, "user_progress", docId);
    const snap = await getDoc(docRef);
    
    if (snap.exists()) {
      const data = snap.data() as PlaybackProgress;
      
      // If Firestore is newer or local doesn't exist, update local
      if (!local || new Date(data.updatedAt).getTime() > new Date(local.updatedAt).getTime()) {
        const cacheKey = `megaAnime_progress_${currentUser.id}_${profileId}`;
        const existingRaw = safeLocalStorage.getItem(cacheKey);
        const existing = existingRaw ? JSON.parse(existingRaw) : {};
        existing[normalizedId] = data;
        safeLocalStorage.setItem(cacheKey, JSON.stringify(existing));
        return data;
      }
    }
  } catch (err) {
    console.warn("Failed to sync progress from Firestore:", err);
  }

  return local;
}

/**
 * Gets progress for ALL animes for the current user/profile.
 * Used to construct "Continuar viendo" or history lists.
 */
export function getAllLocalProgress(currentUser: User | null): PlaybackProgress[] {
  const profileId = currentUser?.activeProfileId || "default";
  const cacheKey = currentUser ? `megaAnime_progress_${currentUser.id}_${profileId}` : "megaAnime_progress_guest";
  
  try {
    const existingRaw = safeLocalStorage.getItem(cacheKey);
    if (!existingRaw) return [];
    const existing = JSON.parse(existingRaw);
    return Object.values(existing) as PlaybackProgress[];
  } catch (err) {
    console.warn("Failed to load all local progress:", err);
    return [];
  }
}

/**
 * Downloads and synchronizes all playback progress data from Firestore for the active profile,
 * ensuring "Continue Watching" syncs instantly on login, device change, or profile switch.
 */
export async function syncAllProgressFromFirestore(currentUser: User | null) {
  if (!currentUser) return;
  const profileId = currentUser.activeProfileId || "default";
  
  try {
    const q = query(
      collection(db, "user_progress"),
      where("userId", "==", currentUser.id),
      where("profileId", "==", profileId)
    );
    
    const snap = await getDocs(q);
    const progressList: Array<{ docId: string; data: PlaybackProgress }> = [];
    
    snap.forEach((doc) => {
      const data = doc.data();
      if (data.animeId) {
        progressList.push({
          docId: doc.id,
          data: {
            animeId: data.animeId,
            episodeId: data.episodeId,
            episodeNumber: data.episodeNumber,
            progressSeconds: data.progressSeconds,
            durationSeconds: data.durationSeconds,
            percentage: data.percentage,
            updatedAt: data.updatedAt,
            contentType: data.contentType || "anime",
            animeTitle: data.animeTitle,
            animeCoverUrl: data.animeCoverUrl
          }
        });
      }
    });
    
    // Sort all progress from newest to oldest
    progressList.sort((a, b) => new Date(b.data.updatedAt).getTime() - new Date(a.data.updatedAt).getTime());
    
    // Split into top 15 (keep) and anything older (discard/delete)
    const activeProgress = progressList.slice(0, 15);
    const excessProgress = progressList.slice(15);
    
    const cacheKey = `megaAnime_progress_${currentUser.id}_${profileId}`;
    let mergedMap: Record<string, PlaybackProgress> = {};
    
    try {
      const existingRaw = safeLocalStorage.getItem(cacheKey);
      if (existingRaw) {
        mergedMap = JSON.parse(existingRaw);
      }
    } catch (e) {}

    // Smart merge: Only update local cache if Firestore is strictly newer
    activeProgress.forEach(item => {
      const local = mergedMap[item.data.animeId];
      if (!local || new Date(item.data.updatedAt).getTime() > new Date(local.updatedAt).getTime()) {
        mergedMap[item.data.animeId] = item.data;
      }
    });

    // Make sure we still strictly limit the final merged local cache to 15 items
    const finalSorted = Object.values(mergedMap)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 15) as PlaybackProgress[];

    const finalMap: Record<string, PlaybackProgress> = {};
    finalSorted.forEach(item => {
      finalMap[item.animeId] = item;
    });
    
    // Async cleanup of excess items in Firestore
    excessProgress.forEach(async (item) => {
      try {
        await deleteDoc(doc(db, "user_progress", item.docId));
      } catch (err) {
        console.warn("Failed to delete excess progress record:", err);
      }
    });
    
    safeLocalStorage.setItem(cacheKey, JSON.stringify(finalMap));
  } catch (err) {
    console.warn("Failed to sync all progress from Firestore:", err);
  }
}

/**
 * Gets all individual episodes progress from LocalStorage cache.
 */
export function getAllEpisodesProgress(currentUser: User | null): Record<string, PlaybackProgress> {
  const profileId = currentUser?.activeProfileId || "default";
  const cacheKey = currentUser ? `megaAnime_episodes_progress_${currentUser.id}_${profileId}` : "megaAnime_episodes_progress_guest";
  try {
    const raw = safeLocalStorage.getItem(cacheKey);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

/**
 * Synchronizes all individual episodes progress from Firestore when opening AnimeDetail.
 */
export async function syncAllEpisodesProgressFromFirestore(currentUser: User | null): Promise<Record<string, PlaybackProgress>> {
  const local = getAllEpisodesProgress(currentUser);
  if (!currentUser) return local;

  const profileId = currentUser.activeProfileId || "default";
  try {
    const q = query(
      collection(db, "episode_progress"),
      where("userId", "==", currentUser.id),
      where("profileId", "==", profileId)
    );
    const snap = await getDocs(q);
    const cacheKey = `megaAnime_episodes_progress_${currentUser.id}_${profileId}`;
    const merged = { ...local };
    
    snap.forEach((doc) => {
      const data = doc.data() as PlaybackProgress;
      if (data.episodeId) {
        const localItem = local[data.episodeId];
        if (!localItem || new Date(data.updatedAt).getTime() > new Date(localItem.updatedAt).getTime()) {
          merged[data.episodeId] = data;
          // Also store under canonical key for cross-API episode matching
          if (data.animeId && data.episodeNumber) {
            const canonKey = getCanonicalEpisodeKey(data.animeId, data.episodeNumber);
            const localCanon = local[canonKey];
            if (!localCanon || new Date(data.updatedAt).getTime() > new Date(localCanon.updatedAt).getTime()) {
              merged[canonKey] = data;
            }
          }
        }
      }
    });

    safeLocalStorage.setItem(cacheKey, JSON.stringify(merged));
    return merged;
  } catch (err) {
    console.warn("Failed to sync all episode progress from Firestore:", err);
    return local;
  }
}

