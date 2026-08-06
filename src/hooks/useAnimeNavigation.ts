import { useState, useCallback } from "react";
import { Anime, Episode, Manga } from "../types";

export function useAnimeNavigation() {
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [selectedManga, setSelectedManga] = useState<Manga | null>(null);
  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(null);

  const handleSelectAnime = useCallback(async (anime: Anime) => {
    const isMovie = anime.type === "Película";
    const isOVA = anime.type === "OVA";
    const count = isMovie ? 1 : isOVA ? 1 : (anime.episodesCount || 12);

    const fallbackEpisodes: Episode[] = Array.from({ length: count }, (_, i) => ({
      id: `${anime.id}-ep-${i + 1}`,
      title: isMovie ? anime.title : isOVA ? `${anime.title} - OVA ${i + 1}` : `${anime.title} - Episodio ${i + 1}`,
      number: i + 1,
      animeId: anime.id,
      animeTitle: anime.title,
      coverUrl: anime.coverUrl,
      videoUrl: `/api/episode/${anime.id}-ep-${i + 1}`
    }));

    const baseAnime: Anime = {
      ...anime,
      episodes: Array.isArray(anime.episodes) && anime.episodes.length > 0 ? anime.episodes : fallbackEpisodes
    };

    setSelectedAnime(baseAnime);

    try {
      const res = await fetch(`/api/anime/${anime.id}`);
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
    } catch (err) {
      console.warn("Could not fetch absolute fresh details, using standard catalog card:", err);
    }
  }, []);

  const handleNavigateEpisode = useCallback((direction: "prev" | "next") => {
    if (!selectedAnime || !selectedAnime.episodes || !Array.isArray(selectedAnime.episodes) || !activeEpisodeId) return;

    const currentIndex = selectedAnime.episodes.findIndex(e => e.id === activeEpisodeId);
    if (currentIndex === -1) return;

    if (direction === "prev" && currentIndex > 0) {
      setActiveEpisodeId(selectedAnime.episodes[currentIndex - 1].id);
    } else if (direction === "next" && currentIndex < selectedAnime.episodes.length - 1) {
      setActiveEpisodeId(selectedAnime.episodes[currentIndex + 1].id);
    }
  }, [selectedAnime, activeEpisodeId]);

  const episodesList = selectedAnime && Array.isArray(selectedAnime.episodes) ? selectedAnime.episodes : [];
  const currentEpIndex = activeEpisodeId ? episodesList.findIndex(e => e.id === activeEpisodeId) : -1;

  const hasPrevEpisode = currentEpIndex > 0;
  const hasNextEpisode = episodesList.length > 0 && currentEpIndex >= 0 && currentEpIndex < episodesList.length - 1;

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

