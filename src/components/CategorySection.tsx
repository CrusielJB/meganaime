import React from "react";
import { Filter, Loader2 } from "lucide-react";
import AnimeCard from "./AnimeCard";
import { Pagination } from "./Pagination";
import { Anime } from "../types";

interface CategorySectionProps {
  categories: string[];
  activeCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  loading: boolean;
  results: Anime[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSelectAnime: (id: string) => void;
  favorites: string[];
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
}

export const CategorySection: React.FC<CategorySectionProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
  loading,
  results,
  currentPage,
  totalPages,
  onPageChange,
  onSelectAnime,
  favorites,
  onToggleFavorite
}) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col space-y-2">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Explorar por Categoría</h1>
        <p className="text-xs text-neutral-400">Filtra todo nuestro catálogo de animes según tus géneros preferidos.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSelectCategory(null)}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
            activeCategory === null
              ? "bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/25"
              : "bg-neutral-900 border-white/5 text-neutral-400 hover:border-neutral-700 hover:text-white"
          }`}
        >
          Todos
        </button>
        {categories.map((cat, idx) => (
          <button
            key={idx}
            onClick={() => onSelectCategory(cat === activeCategory ? null : cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
              activeCategory === cat
                ? "bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/25"
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
            <span>{activeCategory ? `Género: ${activeCategory}` : "Animes en Emisión"}</span>
          </div>
          {activeCategory && (
            <button 
              onClick={() => onSelectCategory(null)}
              className="text-xs text-neutral-500 hover:text-neutral-300 transition"
            >
              Limpiar Filtro
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex h-64 w-full items-center justify-center">
            <div className="flex flex-col items-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
              <span className="text-xs text-neutral-400">{activeCategory ? "Filtrando catálogo..." : "Cargando animes en emisión..."}</span>
            </div>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {(() => {
                const itemsPerPage = 20;
                const paginated = activeCategory
                  ? results.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  : results;
                return paginated.map((anime) => (
                  <AnimeCard
                    key={anime.id}
                    anime={anime}
                    onSelect={onSelectAnime}
                    isFavorite={favorites.includes(anime.id)}
                    onToggleFavorite={onToggleFavorite}
                  />
                ));
              })()}
            </div>

            <Pagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={onPageChange} 
            />
          </div>
        ) : (
          <div className="text-center py-16 rounded-2xl border border-dashed border-white/5">
            <p className="text-neutral-500 text-sm">
              {activeCategory 
                ? `No se encontraron series para la categoría "${activeCategory}" en este momento.`
                : "No hay series en emisión disponibles en este momento."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
