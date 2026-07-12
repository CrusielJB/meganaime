import React from "react";
import { Anime, Manga, User } from "../types";
import { MangaDetail } from "./MangaDetail";
import AnimeDetail from "./AnimeDetail";
import VideoPlayer from "./VideoPlayer";

interface TheatreModeProps {
  selectedAnime: Anime | null;
  selectedManga: Manga | null;
  activeEpisodeId: string | null;
  activeMangaChapterId?: string | null;
  localFavorites: string[];
  onCloseAnime: () => void;
  onCloseManga: () => void;
  onCloseEpisode: () => void;
  onPlayEpisode: (epId: string) => void;
  onToggleFavorite: (id: string) => void;
  onNavigateEpisode: (direction: "prev" | "next") => void;
  hasPrevEpisode: boolean;
  hasNextEpisode: boolean;
  onSelectAnime?: (anime: Anime) => void;
  onSelectManga?: (manga: Manga) => void;
  currentUser?: User | null;
}

export const TheatreMode: React.FC<TheatreModeProps> = ({
  selectedAnime,
  selectedManga,
  activeEpisodeId,
  activeMangaChapterId = null,
  localFavorites,
  onCloseAnime,
  onCloseManga,
  onCloseEpisode,
  onPlayEpisode,
  onToggleFavorite,
  onNavigateEpisode,
  hasPrevEpisode,
  hasNextEpisode,
  onSelectAnime,
  onSelectManga,
  currentUser = null
}) => {
  return (
    <>
      {selectedManga && (
        <MangaDetail
          manga={selectedManga}
          onClose={onCloseManga}
          currentUser={currentUser}
          initialChapterId={activeMangaChapterId}
        />
      )}
      
      {selectedAnime && !activeEpisodeId && (
        <AnimeDetail
          anime={selectedAnime}
          onClose={onCloseAnime}
          onPlayEpisode={onPlayEpisode}
          isFavorite={localFavorites.includes(selectedAnime.id)}
          onToggleFavorite={onToggleFavorite}
          onSelectAnime={onSelectAnime}
          onSelectManga={onSelectManga}
          currentUser={currentUser}
        />
      )}

      {selectedAnime && activeEpisodeId && (
        <VideoPlayer
          animeId={selectedAnime.id}
          episodeId={activeEpisodeId}
          contentType={selectedAnime.type === "Película" ? "movie" : "anime"}
          animeTitle={selectedAnime.title}
          animeCoverUrl={selectedAnime.coverUrl}
          genres={selectedAnime.genres}
          onClose={onCloseEpisode}
          onNavigateEpisode={onNavigateEpisode}
          hasPrev={hasPrevEpisode}
          hasNext={hasNextEpisode}
          currentUser={currentUser}
        />
      )}
    </>
  );
};
