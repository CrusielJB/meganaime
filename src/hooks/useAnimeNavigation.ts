import { useState, useCallback } from "react";
import { Anime, Episode, Manga } from "../types";

export function useAnimeNavigation() {
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [selectedManga, setSelectedManga] = useState<Manga | null>(null);
  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(null);

  const handleSelectAnime = useCallback(async (anime: Anime) => {
    setSelectedAnime(anime);
    try {
      const res = await fetch(`/api/anime/${anime.id}`);
      const freshDetails = await res.json();
      if (freshDetails && !freshDetails.error) {
        setSelectedAnime(prev => {
          if (!prev || prev.id !== anime.id) return prev;
          return {
            ...anime,
            ...freshDetails,
            title: anime.title || freshDetails.title,
            coverUrl: anime.coverUrl || freshDetails.coverUrl,
            bannerUrl: anime.bannerUrl || freshDetails.bannerUrl,
            seasons: anime.seasons || freshDetails.seasons,
          };
        });
      }
    } catch (err) {
      console.warn("Could not fetch absolute fresh details, using standard catalog card:", err);
    }
  }, []);

  const handleNavigateEpisode = useCallback((direction: "prev" | "next") => {
    if (!selectedAnime || !activeEpisodeId) return;
    
    const currentIndex = selectedAnime.episodes.findIndex(e => e.id === activeEpisodeId);
    if (currentIndex === -1) return;

    if (direction === "prev" && currentIndex > 0) {
      setActiveEpisodeId(selectedAnime.episodes[currentIndex - 1].id);
    } else if (direction === "next" && currentIndex < selectedAnime.episodes.length - 1) {
      setActiveEpisodeId(selectedAnime.episodes[currentIndex + 1].id);
    }
  }, [selectedAnime, activeEpisodeId]);

  const currentEpIndex = selectedAnime && activeEpisodeId 
    ? selectedAnime.episodes.findIndex(e => e.id === activeEpisodeId) 
    : -1;
  
  const hasPrevEpisode = currentEpIndex > 0;
  const hasNextEpisode = selectedAnime ? currentEpIndex < selectedAnime.episodes.length - 1 : false;

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
