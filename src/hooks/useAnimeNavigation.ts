import { useState, useCallback } from "react";
import { Anime, Episode, Manga } from "../types";
import { getApiUrl } from "../utils/apiConfig";
import { generateEpisodesForAnime } from "../utils/animeDb";

export function useAnimeNavigation() {
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [selectedManga, setSelectedManga] = useState<Manga | null>(null);
  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(null);

  const handleSelectAnime = useCallback(async (anime: Anime) => {
    const baseAnime: Anime = {
      ...anime,
      episodes: Array.isArray(anime.episodes) && anime.episodes.length > 0 ? anime.episodes : generateEpisodesForAnime(anime)
    };

    setSelectedAnime(baseAnime);

    try {
      const res = await fetch(getApiUrl(`/api/anime/${anime.id}`), { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const freshDetails = await res.json();
        if (freshDetails && !freshDetails.error) {
          setSelectedAnime(prev => {
            if (!prev || prev.id !== anime.id) return prev;
            const freshEps = Array.isArray(freshDetails.episodes) && freshDetails.episodes.length > 0
              ? freshDetails.episodes
              : baseAnime.episodes;

            return {
              ...baseAnime,
              ...freshDetails,
              episodes: freshEps,
              title: anime.title || freshDetails.title,
              coverUrl: anime.coverUrl || freshDetails.coverUrl,
              bannerUrl: anime.bannerUrl || freshDetails.bannerUrl,
              seasons: anime.seasons || freshDetails.seasons,
            };
          });
        }
      }
    } catch (err) {
      console.warn("Could not fetch fresh details, using standard catalog card:", err);
    }
  }, []);

  const handleNavigateEpisode = useCallback((direction: "prev" | "next") => {
    if (!activeEpisodeId) return;

    const episodesList = selectedAnime && Array.isArray(selectedAnime.episodes) ? selectedAnime.episodes : [];
    const currentIndex = episodesList.findIndex(e => e.id === activeEpisodeId);

    if (currentIndex !== -1 && episodesList.length > 1) {
      if (direction === "prev" && currentIndex > 0) {
        setActiveEpisodeId(episodesList[currentIndex - 1].id);
        return;
      } else if (direction === "next" && currentIndex < episodesList.length - 1) {
        setActiveEpisodeId(episodesList[currentIndex + 1].id);
        return;
      }
    }

    // Dynamic numeric navigation fallback
    const match = activeEpisodeId.match(/^(?:tioanime-)?(.+?)-(?:ep|episodio)-(\d+)$/i) || activeEpisodeId.match(/(?:ep|episodio)-(\d+)/i);
    if (match) {
      const epNum = parseInt(match[2] || match[1], 10);
      const baseSlug = match[2] ? match[1] : (selectedAnime?.id ? selectedAnime.id.replace(/^tioanime-/, "") : activeEpisodeId.split("-ep-")[0]);
      
      if (direction === "prev" && epNum > 1) {
        setActiveEpisodeId(`tioanime-${baseSlug}-ep-${epNum - 1}`);
      } else if (direction === "next") {
        setActiveEpisodeId(`tioanime-${baseSlug}-ep-${epNum + 1}`);
      }
    }
  }, [selectedAnime, activeEpisodeId]);

  const episodesList = selectedAnime && Array.isArray(selectedAnime.episodes) ? selectedAnime.episodes : [];
  const currentEpIndex = activeEpisodeId ? episodesList.findIndex(e => e.id === activeEpisodeId) : -1;

  let currentEpNum = 1;
  const epMatch = (activeEpisodeId || "").match(/(?:ep|episodio)-(\d+)/i);
  if (epMatch) currentEpNum = parseInt(epMatch[1], 10);

  const isMovie = selectedAnime?.type === "Película" || selectedAnime?.genres?.includes("Película");
  const maxEpisodes = selectedAnime?.episodesCount || (episodesList.length > 0 ? episodesList.length : 1000);

  const hasPrevEpisode = currentEpIndex !== -1 && episodesList.length > 1
    ? currentEpIndex > 0
    : currentEpNum > 1;

  const hasNextEpisode = isMovie
    ? false
    : (currentEpIndex !== -1 && episodesList.length > 1
        ? currentEpIndex < episodesList.length - 1
        : currentEpNum < maxEpisodes);

  return {
    selectedAnime,
    setSelectedAnime,
    selectedManga,
    setSelectedManga,
    activeEpisodeId,
    setActiveEpisodeId,
    handleSelectAnime,
    handleNavigateEpisode,
    hasPrevEpisode,
    hasNextEpisode
  };
}

