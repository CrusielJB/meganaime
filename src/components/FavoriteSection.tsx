import React, { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import AnimeCard from "./AnimeCard";
import { Anime } from "../types";

interface FavoriteSectionProps {
  currentUser: any;
  favorites: string[];
  trendingAnimes: Anime[];
  seasonalAnimes: Anime[];
  searchResults: Anime[];
  onSelectAnime: (anime: Anime) => void;
  onToggleFavorite: (e: React.MouseEvent, animeId: string) => void;
  onShowAuth: () => void;
  onGoToHome: () => void;
}

export const FavoriteSection: React.FC<FavoriteSectionProps> = ({
  currentUser,
  favorites,
  trendingAnimes,
  seasonalAnimes,
  searchResults,
  onSelectAnime,
  onToggleFavorite,
  onShowAuth,
  onGoToHome
}) => {
  const [resolvedAnimes, setResolvedAnimes] = useState<Record<string, Anime>>({});

  useEffect(() => {
    let active = true;

    async function fetchUnresolvedFavorites() {
      const unresolvedIds = favorites.filter(favId => {
        const locallyResolved = trendingAnimes.some(a => a.id === favId) || 
                                 seasonalAnimes.some(a => a.id === favId) ||
                                 searchResults.some(a => a.id === favId);
        return !locallyResolved && !resolvedAnimes[favId];
      });

      if (unresolvedIds.length === 0) return;

      const fetchedAnimes: Record<string, Anime> = {};
      await Promise.all(
        unresolvedIds.map(async (id) => {
          try {
            const res = await fetch(`/api/anime/${id}`);
            if (!res.ok) return;
            const data = await res.json();
            if (data && data.id && !data.error) {
              fetchedAnimes[id] = data;
            }
          } catch (err) {
            console.error(`Error fetching details for favorite ID ${id}:`, err);
          }
        })
      );

      if (active && Object.keys(fetchedAnimes).length > 0) {
        setResolvedAnimes(prev => ({
          ...prev,
          ...fetchedAnimes
        }));
      }
    }

    fetchUnresolvedFavorites();

    return () => {
      active = false;
    };
  }, [favorites, trendingAnimes, seasonalAnimes, searchResults]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col space-y-2">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Mi Biblioteca de Favoritos</h1>
        <p className="text-xs text-neutral-400">Guarda tus series preferidas para acceder a sus capítulos de forma inmediata.</p>
      </div>

      {!currentUser && (
        <div className="rounded-2xl border border-amber-500/10 bg-amber-500/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="block font-bold text-sm text-amber-400">Sincroniza tus Favoritos en la Nube</span>
            <span className="block text-xs text-neutral-400 mt-0.5">
              Actualmente tus favoritos se guardan localmente en tu navegador. Inicia sesión para guardarlos de forma permanente.
            </span>
          </div>
          <button
            onClick={onShowAuth}
            className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-black hover:bg-amber-400 transition-colors self-start sm:self-auto"
          >
            Iniciar Sesión
          </button>
        </div>
      )}

      {favorites.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {favorites.map((favId) => {
              const resolved = trendingAnimes.find(a => a.id === favId) || 
                               seasonalAnimes.find(a => a.id === favId) ||
                               searchResults.find(a => a.id === favId) ||
                               resolvedAnimes[favId];
              
              if (!resolved) {
                const cleanTitle = favId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                const dummyAnime: Anime = {
                  id: favId,
                  title: cleanTitle,
                  synopsis: "Cargando detalles de tu serie favorita...",
                  coverUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400",
                  bannerUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200",
                  genres: ["Acción", "Fantasía"],
                  status: "En emisión",
                  rating: 8.8,
                  type: "Anime",
                  episodesCount: 12,
                  year: 2024,
                  episodes: []
                };
                return (
                  <AnimeCard
                    key={favId}
                    anime={dummyAnime}
                    onSelect={onSelectAnime}
                    isFavorite={true}
                    onToggleFavorite={onToggleFavorite}
                  />
                );
              }

              return (
                <AnimeCard
                  key={favId}
                  anime={resolved}
                  onSelect={onSelectAnime}
                  isFavorite={true}
                  onToggleFavorite={onToggleFavorite}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-24 rounded-2xl border border-dashed border-white/5 bg-neutral-900/10 flex flex-col items-center justify-center">
          <Heart className="h-10 w-10 text-neutral-600 mb-3" />
          <p className="text-neutral-500 text-sm max-w-md">
            No tienes series guardadas en tus favoritos todavía. Explora el inicio, busca tus series preferidas y pulsa en el corazón para agregarlas aquí.
          </p>
          <button
            onClick={onGoToHome}
            className="mt-4 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-neutral-300 transition"
          >
            Explorar Catálogo
          </button>
        </div>
      )}
    </div>
  );
};
