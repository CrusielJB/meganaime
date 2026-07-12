import React, { useState, useMemo, useRef } from "react";
import { Manga } from "../types";
import { Star, Calendar, BookOpen, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { MangaDetail } from "./MangaDetail";
import { Pagination } from "./Pagination";
import { getProxyImageUrl, getAnimePlaceholder, recoverCoverImageInHotPath } from "../utils/imageUtils";
import { useMangaData } from "../hooks/useMangaData";

interface MangaSectionProps {
  categories: string[];
}

export const MangaSection: React.FC<MangaSectionProps> = ({ categories }) => {
  const { mangas, loading, page, setPage, totalPages, activeGenre, setActiveGenre } = useMangaData();
  const [selectedManga, setSelectedManga] = useState<Manga | null>(null);

  // References for sliding rows
  const popularRowRef = useRef<HTMLDivElement>(null);
  const actionRowRef = useRef<HTMLDivElement>(null);
  const fantasyRowRef = useRef<HTMLDivElement>(null);
  const comedyRowRef = useRef<HTMLDivElement>(null);

  const scrollRow = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const { scrollLeft, clientWidth } = ref.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth * 0.8 : scrollLeft + clientWidth * 0.8;
      ref.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  const handleSelectManga = (manga: Manga) => {
    setSelectedManga(manga);
  };

  const handleSelectGenre = (genre: string | null) => {
    setActiveGenre(genre);
    setPage(1);
  };

  // Filter mangas into genres for carousels (when activeGenre === null)
  const actionMangas = useMemo(() => {
    return mangas.filter(m => m.genres.some(g => ["acción", "aventura", "action", "adventure", "sports"].includes(g.toLowerCase())));
  }, [mangas]);

  const fantasyMangas = useMemo(() => {
    return mangas.filter(m => m.genres.some(g => ["fantasía", "fantasy", "supernatural", "horror", "dark fantasy", "mystery", "thriller", "supernatural"].includes(g.toLowerCase())));
  }, [mangas]);

  const comedyMangas = useMemo(() => {
    return mangas.filter(m => m.genres.some(g => ["comedia", "comedy", "isekai", "slice of life", "drama"].includes(g.toLowerCase())));
  }, [mangas]);

  // Featured Manga for the Netflix-style Hero
  const featuredManga = useMemo(() => {
    if (mangas.length === 0) return null;
    const favoriteFeatured = mangas.find(m => m.title.toLowerCase().includes("berserk") || m.title.toLowerCase().includes("one piece") || m.title.toLowerCase().includes("chainsaw man"));
    return favoriteFeatured || mangas[0];
  }, [mangas]);

  if (loading && mangas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-36 gap-4">
        <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
        <p className="text-neutral-400 text-xs font-semibold animate-pulse">Cargando biblioteca de manga popular...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in pb-12">
      {/* Category selector row */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-1 bg-rose-500 rounded-full" />
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2 tracking-tight">
            <BookOpen className="w-5 h-5 text-rose-500" />
            Manga Popular
          </h2>
        </div>

        <div className="flex flex-wrap gap-2 pb-2">
          <button
            onClick={() => handleSelectGenre(null)}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
              activeGenre === null
                ? "bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/25"
                : "bg-neutral-900 border-white/5 text-neutral-400 hover:border-neutral-700 hover:text-white"
            }`}
          >
            Todos
          </button>
          {categories.map((cat, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectGenre(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                activeGenre === cat
                  ? "bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/25"
                  : "bg-neutral-900 border-white/5 text-neutral-400 hover:border-neutral-700 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {activeGenre === null ? (
        // SHOW PREMIUM NETFLIX VIEW WHEN NO GENRE IS ACTIVE
        <div className="space-y-12">
          {/* Featured Manga Hero Banner */}
          {featuredManga && (
            <div className="relative h-[440px] w-full overflow-hidden rounded-3xl border border-white/5 bg-neutral-950 shadow-2xl">
              {/* Cover image backdrop */}
              <div className="absolute inset-0 z-0">
                <img
                  src={getProxyImageUrl(featuredManga.coverUrl, featuredManga.title)}
                  alt=""
                  className="h-full w-full object-cover object-center brightness-[0.35] blur-[1px]"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    recoverCoverImageInHotPath(e, featuredManga.title, featuredManga.id, "MANGA");
                  }}
                />
                {/* Ambient gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/40 to-transparent" />
              </div>

              {/* Hero Content */}
              <div className="absolute bottom-0 left-0 right-0 z-10 p-6 md:p-10 max-w-2xl space-y-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-extrabold bg-rose-500 text-white tracking-wider uppercase">
                  Manga Recomendado
                </span>
                <h1 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tight">
                  {featuredManga.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-neutral-300">
                  <span className="flex items-center text-amber-400 font-bold">
                    <Star className="h-4 w-4 mr-1 fill-amber-400 text-amber-400" />
                    {(featuredManga.rating || 0).toFixed(1)}
                  </span>
                  <span>•</span>
                  <span>{featuredManga.year}</span>
                  <span>•</span>
                  <span>{featuredManga.chaptersCount} Capítulos</span>
                  <span>•</span>
                  <div className="flex gap-1.5">
                    {featuredManga.genres.slice(0, 3).map((g) => (
                      <span key={g} className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-semibold text-neutral-200">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="text-xs md:text-sm text-neutral-400 line-clamp-3 leading-relaxed">
                  {featuredManga.synopsis || "Una de las mayores joyas literarias ilustradas. Adéntrate en su impactante narrativa, complejos personajes y espectacular estilo visual."}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => handleSelectManga(featuredManga)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs tracking-wider uppercase transition shadow-lg shadow-rose-500/20 cursor-pointer"
                  >
                    <BookOpen className="h-4 w-4 text-white" />
                    <span>Leer Manga</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Row 1: Todos los Mangas */}
          <section className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="h-6 w-1 bg-rose-500 rounded-full" />
              <h3 className="text-md font-extrabold text-white flex items-center gap-2 tracking-tight">
                Todos los Mangas Populares
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
                {mangas.map((manga) => (
                  <div 
                    key={manga.id} 
                    className="flex-shrink-0 w-[140px] sm:w-[165px] md:w-[190px] snap-start group cursor-pointer bg-neutral-900/50 border border-white/5 rounded-2xl overflow-hidden hover:border-rose-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-rose-500/10"
                    onClick={() => handleSelectManga(manga)}
                  >
                    <div className="relative overflow-hidden" style={{ aspectRatio: "3/4" }}>
                      <img 
                        src={getProxyImageUrl(manga.coverUrl, manga.title)} 
                        alt={manga.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        onError={(e) => {
                          recoverCoverImageInHotPath(e, manga.title, manga.id, "MANGA");
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60" />
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] font-bold text-yellow-500 border border-white/10">
                        <Star className="w-3 h-3 fill-yellow-500" /> {manga.rating}
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="text-xs font-bold text-white line-clamp-1 group-hover:text-rose-400 transition-colors">{manga.title}</h3>
                      <div className="flex items-center justify-between mt-2 text-[10px] text-neutral-400 font-medium">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {manga.year}</span>
                        <span className="text-rose-500">{manga.status}</span>
                      </div>
                    </div>
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
          {actionMangas.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="h-6 w-1 bg-rose-500 rounded-full" />
                <h3 className="text-md font-extrabold text-white tracking-tight">
                  Combates y Aventuras Épicas
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
                  {actionMangas.map((manga) => (
                    <div 
                      key={manga.id} 
                      className="flex-shrink-0 w-[140px] sm:w-[165px] md:w-[190px] snap-start group cursor-pointer bg-neutral-900/50 border border-white/5 rounded-2xl overflow-hidden hover:border-rose-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-rose-500/10"
                      onClick={() => handleSelectManga(manga)}
                    >
                      <div className="relative overflow-hidden" style={{ aspectRatio: "3/4" }}>
                        <img 
                          src={getProxyImageUrl(manga.coverUrl, manga.title)} 
                          alt={manga.title} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          onError={(e) => {
                            recoverCoverImageInHotPath(e, manga.title, manga.id, "MANGA");
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60" />
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] font-bold text-yellow-500 border border-white/10">
                          <Star className="w-3 h-3 fill-yellow-500" /> {manga.rating}
                        </div>
                      </div>
                      <div className="p-3">
                        <h3 className="text-xs font-bold text-white line-clamp-1 group-hover:text-rose-400 transition-colors">{manga.title}</h3>
                        <div className="flex items-center justify-between mt-2 text-[10px] text-neutral-400 font-medium">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {manga.year}</span>
                          <span className="text-rose-500">{manga.status}</span>
                        </div>
                      </div>
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

          {/* Row 3: Fantasía Oscura & Misterio */}
          {fantasyMangas.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="h-6 w-1 bg-rose-500 rounded-full" />
                <h3 className="text-md font-extrabold text-white tracking-tight">
                  Fantasía Oscura, Magia y Misterio
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
                  {fantasyMangas.map((manga) => (
                    <div 
                      key={manga.id} 
                      className="flex-shrink-0 w-[140px] sm:w-[165px] md:w-[190px] snap-start group cursor-pointer bg-neutral-900/50 border border-white/5 rounded-2xl overflow-hidden hover:border-rose-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-rose-500/10"
                      onClick={() => handleSelectManga(manga)}
                    >
                      <div className="relative overflow-hidden" style={{ aspectRatio: "3/4" }}>
                        <img 
                          src={getProxyImageUrl(manga.coverUrl, manga.title)} 
                          alt={manga.title} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          onError={(e) => {
                            recoverCoverImageInHotPath(e, manga.title, manga.id, "MANGA");
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60" />
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] font-bold text-yellow-500 border border-white/10">
                          <Star className="w-3 h-3 fill-yellow-500" /> {manga.rating}
                        </div>
                      </div>
                      <div className="p-3">
                        <h3 className="text-xs font-bold text-white line-clamp-1 group-hover:text-rose-400 transition-colors">{manga.title}</h3>
                        <div className="flex items-center justify-between mt-2 text-[10px] text-neutral-400 font-medium">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {manga.year}</span>
                          <span className="text-rose-500">{manga.status}</span>
                        </div>
                      </div>
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

          {/* Row 4: Comedia, Isekai & Vida Diaria */}
          {comedyMangas.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="h-6 w-1 bg-rose-500 rounded-full" />
                <h3 className="text-md font-extrabold text-white tracking-tight">
                  Comedia, Isekai y Vida Diaria
                </h3>
              </div>

              <div className="relative group/row">
                <button 
                  onClick={() => scrollRow(comedyRowRef, 'left')}
                  className="absolute left-0 top-0 bottom-0 w-12 z-20 bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[3px] border-r border-white/5"
                >
                  <ChevronLeft className="h-8 w-8 text-neutral-400 hover:text-white" />
                </button>

                <div 
                  ref={comedyRowRef}
                  className="flex overflow-x-auto overflow-y-hidden gap-4 pb-4 scrollbar-hide scroll-smooth snap-x snap-mandatory px-1"
                >
                  {comedyMangas.map((manga) => (
                    <div 
                      key={manga.id} 
                      className="flex-shrink-0 w-[140px] sm:w-[165px] md:w-[190px] snap-start group cursor-pointer bg-neutral-900/50 border border-white/5 rounded-2xl overflow-hidden hover:border-rose-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-rose-500/10"
                      onClick={() => handleSelectManga(manga)}
                    >
                      <div className="relative overflow-hidden" style={{ aspectRatio: "3/4" }}>
                        <img 
                          src={getProxyImageUrl(manga.coverUrl, manga.title)} 
                          alt={manga.title} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          onError={(e) => {
                            recoverCoverImageInHotPath(e, manga.title, manga.id, "MANGA");
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60" />
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] font-bold text-yellow-500 border border-white/10">
                          <Star className="w-3 h-3 fill-yellow-500" /> {manga.rating}
                        </div>
                      </div>
                      <div className="p-3">
                        <h3 className="text-xs font-bold text-white line-clamp-1 group-hover:text-rose-400 transition-colors">{manga.title}</h3>
                        <div className="flex items-center justify-between mt-2 text-[10px] text-neutral-400 font-medium">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {manga.year}</span>
                          <span className="text-rose-500">{manga.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => scrollRow(comedyRowRef, 'right')}
                  className="absolute right-0 top-0 bottom-0 w-12 z-20 bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[3px] border-l border-white/5"
                >
                  <ChevronRight className="h-8 w-8 text-neutral-400 hover:text-white" />
                </button>
              </div>
            </section>
          )}
        </div>
      ) : (
        // SHOW REMOTE PAGINATED GRID VIEW WHEN A FILTER IS ACTIVE
        <div className="space-y-6 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-rose-400 uppercase tracking-wider">
              Categoría Manga: {activeGenre}
            </span>
            <button 
              onClick={() => handleSelectGenre(null)}
              className="text-xs text-neutral-500 hover:text-neutral-300 transition cursor-pointer"
            >
              Limpiar Filtro
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
              <p className="text-neutral-400 text-xs font-medium">Cargando mangas filtrados...</p>
            </div>
          ) : mangas.length > 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {mangas.map((manga) => (
                  <div 
                    key={manga.id} 
                    className="group cursor-pointer bg-neutral-900/50 border border-white/5 rounded-2xl overflow-hidden hover:border-rose-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-rose-500/10"
                    onClick={() => handleSelectManga(manga)}
                  >
                    <div className="relative overflow-hidden" style={{ aspectRatio: "3/4" }}>
                      <img 
                        src={getProxyImageUrl(manga.coverUrl, manga.title)} 
                        alt={manga.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        onError={(e) => {
                          recoverCoverImageInHotPath(e, manga.title, manga.id, "MANGA");
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60" />
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] font-bold text-yellow-500 border border-white/10">
                        <Star className="w-3 h-3 fill-yellow-500" /> {manga.rating}
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="text-xs font-bold text-white line-clamp-1 group-hover:text-rose-400 transition-colors">{manga.title}</h3>
                      <div className="flex items-center justify-between mt-2 text-[10px] text-neutral-400 font-medium">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {manga.year}</span>
                        <span className="text-rose-500">{manga.status}</span>
                      </div>
                    </div>
                  </div>
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
                No se encontraron mangas para la categoría "{activeGenre}" en este momento.
              </p>
            </div>
          )}
        </div>
      )}

      {selectedManga && (
        <MangaDetail manga={selectedManga} onClose={() => setSelectedManga(null)} />
      )}
    </div>
  );
};
