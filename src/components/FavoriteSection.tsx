import React, { useState, useEffect } from "react";
import { Heart, Trash2, Search, X } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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

  const STATUS_TABS = [
    { id: "all", label: "Todos", icon: "⭐" },
    { id: "viendo", label: "Viendo", icon: "🟢" },
    { id: "por_ver", label: "Por Ver", icon: "🟡" },
    { id: "completado", label: "Completado", icon: "✅" },
    { id: "en_pausa", label: "En Pausa", icon: "⏸️" },
    { id: "abandonado", label: "Abandonado", icon: "🔴" }
  ];

  // Filter favorites by search query and status filter
  const filteredFavorites = favorites.filter(favId => {
    if (!searchQuery.trim()) return true;
    const anime = trendingAnimes.find(a => a.id === favId) || 
                  seasonalAnimes.find(a => a.id === favId) ||
                  searchResults.find(a => a.id === favId) ||
                  resolvedAnimes[favId];
    const title = anime ? anime.title : favId.replace(/-/g, " ");
    return title.toLowerCase().includes(searchQuery.toLowerCase().trim());
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Mi Biblioteca de Anime</h1>
            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/30">
              {favorites.length} {favorites.length === 1 ? "serie" : "series"}
            </span>
          </div>
          <p className="text-xs text-neutral-400">Administra tus favoritos, elimina animes de tu lista o busca tus series guardadas.</p>
        </div>

        {/* Search inside favorites */}
        {favorites.length > 0 && (
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en tus favoritos..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-neutral-900/90 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Watch Status Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/5 scrollbar-none">
        {STATUS_TABS.map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border shrink-0 ${
                isActive
                  ? "bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/20"
                  : "bg-neutral-900/60 text-neutral-400 border-white/5 hover:bg-neutral-800 hover:text-white"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
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
          {filteredFavorites.length === 0 ? (
            <div className="text-center py-12 bg-neutral-900/30 rounded-xl border border-white/5 text-neutral-400 text-xs">
              No se encontraron animes guardados con el filtro "{searchQuery}".
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredFavorites.map((favId) => {
                const resolved = trendingAnimes.find(a => a.id === favId) || 
                                 seasonalAnimes.find(a => a.id === favId) ||
                                 searchResults.find(a => a.id === favId) ||
                                 resolvedAnimes[favId];
                
                const animeObj: Anime = resolved || {
                  id: favId,
                  title: favId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
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
                  <div key={favId} className="relative group/fav">
                    <AnimeCard
                      anime={animeObj}
                      onSelect={onSelectAnime}
                      isFavorite={true}
                      onToggleFavorite={onToggleFavorite}
                    />

                    {/* Prominent Quick-Remove Button overlay */}
                    <button
                      onClick={(e) => onToggleFavorite(e, favId)}
                      className="absolute top-2 right-2 z-30 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-rose-600/90 text-white font-bold text-[10px] shadow-lg border border-rose-400/40 opacity-90 group-hover/fav:opacity-100 hover:bg-rose-500 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                      title="Eliminar de favoritos"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Quitar</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
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

