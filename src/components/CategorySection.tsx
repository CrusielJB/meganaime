import React from "react";
import { Filter, Loader2, Tv, Film, PlayCircle, Sparkles } from "lucide-react";
import AnimeCard from "./AnimeCard";
import { Pagination } from "./Pagination";
import { Anime } from "../types";

interface CategorySectionProps {
  categories: string[];
  activeCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  activeType?: string;
  onSelectType?: (type: string) => void;
  loading: boolean;
  results: Anime[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSelectAnime: (id: string) => void;
  favorites: string[];
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
}

const TYPE_OPTIONS = [
  { id: "todos", label: "Todos los tipos", icon: Sparkles },
  { id: "anime", label: "Animes", icon: Tv },
  { id: "pelicula", label: "Películas", icon: Film },
  { id: "ova", label: "OVAs", icon: PlayCircle },
];

export const CategorySection: React.FC<CategorySectionProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
  activeType = "todos",
  onSelectType,
  loading,
  results = [],
  currentPage,
  totalPages,
  onPageChange,
  onSelectAnime,
  favorites,
  onToggleFavorite
}) => {
  const safeResults = Array.isArray(results) ? results : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col space-y-2">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Explorar Catálogo</h1>
        <p className="text-xs text-neutral-400">Navega por las 4,500+ series, películas y OVAs activas de nuestro catálogo.</p>
      </div>

      {/* Type Filter Buttons */}
      {onSelectType && (
        <div className="flex flex-wrap gap-2 pb-2 border-b border-white/5">
          {TYPE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = activeType === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => onSelectType(opt.id)}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition border ${
                  isSelected
                    ? "bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/25"
                    : "bg-neutral-900 border-white/5 text-neutral-400 hover:border-neutral-700 hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Genre Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSelectCategory(null)}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition ${
            activeCategory === null
              ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
              : "bg-neutral-900 border-white/5 text-neutral-400 hover:border-neutral-700 hover:text-white"
          }`}
        >
          Todos los Géneros
        </button>
        {categories.map((cat, idx) => (
          <button
            key={idx}
            onClick={() => onSelectCategory(cat === activeCategory ? null : cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition ${
              activeCategory === cat
                ? "bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-lg shadow-rose-500/10"
                : "bg-neutral-900 border-white/5 text-neutral-400 hover:border-neutral-700 hover:text-white"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-4 pt-4 border-t border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm uppercase tracking-wider">
            <Filter className="h-4 w-4" />
            <span>
              {activeCategory ? `Género: ${activeCategory}` : "Catálogo Completo"}
              {activeType !== "todos" && ` (${activeType.toUpperCase()})`}
            </span>
          </div>
          {(activeCategory || activeType !== "todos") && (
            <button 
              onClick={() => {
                onSelectCategory(null);
                if (onSelectType) onSelectType("todos");
              }}
              className="text-xs text-neutral-500 hover:text-neutral-300 transition"
            >
              Limpiar Filtros
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex h-64 w-full items-center justify-center">
            <div className="flex flex-col items-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
              <span className="text-xs text-neutral-400">Cargando catálogo...</span>
            </div>
          </div>
        ) : safeResults.length > 0 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {safeResults.map((anime) => (
                <AnimeCard
                  key={anime.id}
                  anime={anime}
                  onSelect={onSelectAnime}
                  isFavorite={favorites.includes(anime.id)}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination 
                currentPage={currentPage} 
                totalPages={totalPages} 
                onPageChange={onPageChange} 
              />
            )}
          </div>
        ) : (
          <div className="text-center py-16 rounded-2xl border border-dashed border-white/5">
            <p className="text-neutral-500 text-sm">
              No se encontraron contenidos con los filtros seleccionados.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

