import React, { useState, useEffect, useMemo, useRef } from "react";
import { Film, Loader2, Play, Heart, ChevronLeft, ChevronRight, Star } from "lucide-react";
import AnimeCard from "./AnimeCard";
import { Pagination } from "./Pagination";
import { Anime } from "../types";
import { getProxyImageUrl, getAnimePlaceholder, recoverCoverImageInHotPath } from "../utils/imageUtils";

interface MovieSectionProps {
  onSelectAnime: (anime: Anime) => void;
  favorites: string[];
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
  categories: string[];
}

export const MovieSection: React.FC<MovieSectionProps> = ({ 
  onSelectAnime, 
  favorites, 
  onToggleFavorite,
  categories
}) => {
  const [movies, setMovies] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering & Pagination State
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const moviesPerPage = 20;

  // References for sliding rows
  const popularRowRef = useRef<HTMLDivElement>(null);
  const actionRowRef = useRef<HTMLDivElement>(null);
  const fantasyRowRef = useRef<HTMLDivElement>(null);
  const dramaRowRef = useRef<HTMLDivElement>(null);

  const scrollRow = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const { scrollLeft, clientWidth } = ref.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth * 0.8 : scrollLeft + clientWidth * 0.8;
      ref.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/movies");
        const data = await response.json();
        const mappedData = Array.isArray(data) ? data.map((m: any) => ({
          ...m,
          coverUrl: m.coverUrl || m.cover,
          bannerUrl: m.bannerUrl || m.banner || m.cover,
          rating: m.rating || 0,
          genres: m.genres || ["Película"],
          episodesCount: 1,
          type: "Película" as const,
          episodes: []
        })) : [];
        setMovies(mappedData);
      } catch (error) {
        console.error("Error fetching movies:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, []);

  const handleSelectCategory = (cat: string | null) => {
    setActiveCategory(cat);
    setPage(1);
  };

  // Filter movies for grid display when category is selected
  const filteredMovies = useMemo(() => {
    if (!activeCategory) return movies;
    return movies.filter(m => m.genres.some(g => g.toLowerCase() === activeCategory.toLowerCase()));
  }, [movies, activeCategory]);

  const totalPages = Math.ceil(filteredMovies.length / moviesPerPage) || 1;
  const currentMovies = useMemo(() => {
    return filteredMovies.slice((page - 1) * moviesPerPage, page * moviesPerPage);
  }, [filteredMovies, page]);

  // Filter movies into genres for carousels (when activeCategory === null)
  const actionMovies = useMemo(() => {
    return movies.filter(m => m.genres.some(g => ["acción", "aventura", "action", "adventure"].includes(g.toLowerCase())));
  }, [movies]);

  const fantasyMovies = useMemo(() => {
    return movies.filter(m => m.genres.some(g => ["fantasía", "fantasy", "sobrenatural", "supernatural", "misterio", "mystery"].includes(g.toLowerCase())));
  }, [movies]);

  const dramaMovies = useMemo(() => {
    return movies.filter(m => m.genres.some(g => ["drama", "romance", "recuentos de la vida", "slice of life"].includes(g.toLowerCase())));
  }, [movies]);

  // Featured Movie for the Netflix-style Hero
  const featuredMovie = useMemo(() => {
    if (movies.length === 0) return null;
    const favoriteFeatured = movies.find(m => m.title.toLowerCase().includes("your name") || m.title.toLowerCase().includes("suzume") || m.title.toLowerCase().includes("el viaje de chihiro"));
    return favoriteFeatured || movies[0];
  }, [movies]);

  if (loading && movies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-36 gap-4">
        <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
        <p className="text-neutral-400 text-xs font-semibold animate-pulse">Sincronizando catálogo de películas de estreno...</p>
      </div>
    );
  }

  const isFeaturedFavorite = featuredMovie ? favorites.includes(featuredMovie.id) : false;

  return (
    <div className="space-y-10 animate-fade-in pb-12">
      {/* Category selector row */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-1 bg-rose-500 rounded-full" />
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2 tracking-tight">
            <Film className="w-5 h-5 text-rose-500" />
            Películas de Anime
          </h2>
        </div>

        <div className="flex flex-wrap gap-2 pb-2">
          <button
            onClick={() => handleSelectCategory(null)}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
              activeCategory === null
                ? "bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/25"
                : "bg-neutral-900 border-white/5 text-neutral-400 hover:border-neutral-700 hover:text-white"
            }`}
          >
            Todas
          </button>
          {categories.map((cat, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                activeCategory === cat
                  ? "bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/25"
                  : "bg-neutral-900 border-white/5 text-neutral-400 hover:border-neutral-700 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {activeCategory === null ? (
        // SHOW PREMIUM NETFLIX VIEW WHEN NO CATEGORY IS ACTIVE
        <div className="space-y-12">
          {/* Featured Movie Hero Banner */}
          {featuredMovie && (
            <div className="relative h-[440px] w-full overflow-hidden rounded-3xl border border-white/5 bg-neutral-950 shadow-2xl">
              {/* Cover image backdrop */}
              <div className="absolute inset-0 z-0">
                <img
                  src={getProxyImageUrl(featuredMovie.bannerUrl || featuredMovie.coverUrl, featuredMovie.title, true)}
                  alt=""
                  className="h-full w-full object-cover object-center brightness-[0.4]"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    recoverCoverImageInHotPath(e, featuredMovie.title, featuredMovie.id);
                  }}
                />
                {/* Ambient gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/40 to-transparent" />
              </div>

              {/* Hero Content */}
              <div className="absolute bottom-0 left-0 right-0 z-10 p-6 md:p-10 max-w-2xl space-y-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-extrabold bg-rose-500 text-white tracking-wider uppercase">
                  Película Destacada
                </span>
                <h1 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tight">
                  {featuredMovie.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-neutral-300">
                  <span className="flex items-center text-amber-400 font-bold">
                    <Star className="h-4 w-4 mr-1 fill-amber-400 text-amber-400" />
                    {(featuredMovie.rating || 0).toFixed(1)}
                  </span>
                  <span>•</span>
                  <span>{featuredMovie.year}</span>
                  <span>•</span>
                  <div className="flex gap-1.5">
                    {featuredMovie.genres.slice(0, 3).map((g) => (
                      <span key={g} className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-semibold text-neutral-200">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="text-xs md:text-sm text-neutral-400 line-clamp-3 leading-relaxed">
                  {featuredMovie.synopsis || "Una espectacular obra maestra cinematográfica del anime. Adéntrate en su fascinante historia y maravillosos paisajes animados."}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => onSelectAnime(featuredMovie)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs tracking-wider uppercase transition shadow-lg shadow-rose-500/20 cursor-pointer"
                  >
                    <Play className="h-4 w-4 fill-white" />
                    <span>Ver Película</span>
                  </button>
                  <button
                    onClick={(e) => onToggleFavorite(e, featuredMovie.id)}
                    className={`inline-flex items-center gap-2 px-4.5 py-2.5 rounded-xl border font-bold text-xs tracking-wider uppercase transition cursor-pointer ${
                      isFeaturedFavorite
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                        : "bg-white/5 border-white/5 text-neutral-300 hover:bg-white/10"
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${isFeaturedFavorite ? "fill-rose-400" : ""}`} />
                    <span>{isFeaturedFavorite ? "En tu Lista" : "Mi Lista"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Row 1: Todas las Películas */}
          <section className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="h-6 w-1 bg-rose-500 rounded-full" />
              <h3 className="text-md font-extrabold text-white flex items-center gap-2 tracking-tight">
                Todas las Películas
              </h3>
            </div>

            <div className="relative group/row">
              <button 
                onClick={() => scrollRow(popularRowRef, 'left')}
                className="absolute left-0 top-0 bottom-0 w-12 z-20 bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[3px] border-r border-white/5"
              >
                <ChevronLeft className="h-8 w-8 text-neutral-400 hover:text-white" />
              </button>

              <div 
                ref={popularRowRef}
                className="flex overflow-x-auto overflow-y-hidden gap-4 pb-4 scrollbar-hide scroll-smooth snap-x snap-mandatory px-1"
              >
                {movies.map((movie) => (
                  <div key={movie.id} className="flex-shrink-0 w-[140px] sm:w-[165px] md:w-[190px] snap-start">
                    <AnimeCard
                      anime={movie}
                      onSelect={onSelectAnime}
                      isFavorite={favorites.includes(movie.id)}
                      onToggleFavorite={onToggleFavorite}
                    />
                  </div>
                ))}
              </div>

              <button 
                onClick={() => scrollRow(popularRowRef, 'right')}
                className="absolute right-0 top-0 bottom-0 w-12 z-20 bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[3px] border-l border-white/5"
              >
                <ChevronRight className="h-8 w-8 text-neutral-400 hover:text-white" />
              </button>
            </div>
          </section>

          {/* Row 2: Acción & Aventura */}
          {actionMovies.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="h-6 w-1 bg-rose-500 rounded-full" />
                <h3 className="text-md font-extrabold text-white tracking-tight">
                  Acción y Grandes Aventuras
                </h3>
              </div>

              <div className="relative group/row">
                <button 
                  onClick={() => scrollRow(actionRowRef, 'left')}
                  className="absolute left-0 top-0 bottom-0 w-12 z-20 bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[3px] border-r border-white/5"
                >
                  <ChevronLeft className="h-8 w-8 text-neutral-400 hover:text-white" />
                </button>

                <div 
                  ref={actionRowRef}
                  className="flex overflow-x-auto overflow-y-hidden gap-4 pb-4 scrollbar-hide scroll-smooth snap-x snap-mandatory px-1"
                >
                  {actionMovies.map((movie) => (
                    <div key={movie.id} className="flex-shrink-0 w-[140px] sm:w-[165px] md:w-[190px] snap-start">
                      <AnimeCard
                        anime={movie}
                        onSelect={onSelectAnime}
                        isFavorite={favorites.includes(movie.id)}
                        onToggleFavorite={onToggleFavorite}
                      />
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => scrollRow(actionRowRef, 'right')}
                  className="absolute right-0 top-0 bottom-0 w-12 z-20 bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[3px] border-l border-white/5"
                >
                  <ChevronRight className="h-8 w-8 text-neutral-400 hover:text-white" />
                </button>
              </div>
            </section>
          )}

          {/* Row 3: Fantasía y Sobrenatural */}
          {fantasyMovies.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="h-6 w-1 bg-rose-500 rounded-full" />
                <h3 className="text-md font-extrabold text-white tracking-tight">
                  Fantasía, Magia y Misterio
                </h3>
              </div>

              <div className="relative group/row">
                <button 
                  onClick={() => scrollRow(fantasyRowRef, 'left')}
                  className="absolute left-0 top-0 bottom-0 w-12 z-20 bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[3px] border-r border-white/5"
                >
                  <ChevronLeft className="h-8 w-8 text-neutral-400 hover:text-white" />
                </button>

                <div 
                  ref={fantasyRowRef}
                  className="flex overflow-x-auto overflow-y-hidden gap-4 pb-4 scrollbar-hide scroll-smooth snap-x snap-mandatory px-1"
                >
                  {fantasyMovies.map((movie) => (
                    <div key={movie.id} className="flex-shrink-0 w-[140px] sm:w-[165px] md:w-[190px] snap-start">
                      <AnimeCard
                        anime={movie}
                        onSelect={onSelectAnime}
                        isFavorite={favorites.includes(movie.id)}
                        onToggleFavorite={onToggleFavorite}
                      />
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => scrollRow(fantasyRowRef, 'right')}
                  className="absolute right-0 top-0 bottom-0 w-12 z-20 bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[3px] border-l border-white/5"
                >
                  <ChevronRight className="h-8 w-8 text-neutral-400 hover:text-white" />
                </button>
              </div>
            </section>
          )}

          {/* Row 4: Drama y Romance */}
          {dramaMovies.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="h-6 w-1 bg-rose-500 rounded-full" />
                <h3 className="text-md font-extrabold text-white tracking-tight">
                  Drama, Romance y Emociones
                </h3>
              </div>

              <div className="relative group/row">
                <button 
                  onClick={() => scrollRow(dramaRowRef, 'left')}
                  className="absolute left-0 top-0 bottom-0 w-12 z-20 bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[3px] border-r border-white/5"
                >
                  <ChevronLeft className="h-8 w-8 text-neutral-400 hover:text-white" />
                </button>

                <div 
                  ref={dramaRowRef}
                  className="flex overflow-x-auto overflow-y-hidden gap-4 pb-4 scrollbar-hide scroll-smooth snap-x snap-mandatory px-1"
                >
                  {dramaMovies.map((movie) => (
                    <div key={movie.id} className="flex-shrink-0 w-[140px] sm:w-[165px] md:w-[190px] snap-start">
                      <AnimeCard
                        anime={movie}
                        onSelect={onSelectAnime}
                        isFavorite={favorites.includes(movie.id)}
                        onToggleFavorite={onToggleFavorite}
                      />
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => scrollRow(dramaRowRef, 'right')}
                  className="absolute right-0 top-0 bottom-0 w-12 z-20 bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[3px] border-l border-white/5"
                >
                  <ChevronRight className="h-8 w-8 text-neutral-400 hover:text-white" />
                </button>
              </div>
            </section>
          )}
        </div>
      ) : (
        // SHOW PAGINATED GRID VIEW WHEN A FILTER IS SELECTED
        <div className="space-y-6 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-rose-400 uppercase tracking-wider">
              Categoría: {activeCategory}
            </span>
            <button 
              onClick={() => handleSelectCategory(null)}
              className="text-xs text-neutral-500 hover:text-neutral-300 transition cursor-pointer"
            >
              Limpiar Filtro
            </button>
          </div>

          {currentMovies.length > 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {currentMovies.map((movie) => (
                  <AnimeCard
                    key={movie.id}
                    anime={movie}
                    onSelect={onSelectAnime}
                    isFavorite={favorites.includes(movie.id)}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </div>

              <Pagination 
                currentPage={page} 
                totalPages={totalPages} 
                onPageChange={setPage} 
              />
            </div>
          ) : (
            <div className="text-center py-16 rounded-2xl border border-dashed border-white/5 bg-neutral-900/10">
              <p className="text-neutral-500 text-sm">
                No se encontraron películas para la categoría "{activeCategory}" en este momento.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
