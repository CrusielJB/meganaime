import React, { useState, useEffect, useMemo, useRef } from "react";
import { TrendingUp, Sparkles, Clock, Loader2, Film, Play, Trash2, ChevronLeft, ChevronRight, Heart, Star, ListPlus } from "lucide-react";
import AnimeCard from "./AnimeCard";
import Hero from "./Hero";
import { Anime, User, Manga } from "../types";
import { getAllLocalProgress, syncAllProgressFromFirestore, normalizeAnimeId } from "../utils/progress";
import { safeLocalStorage } from "../utils/safeStorage";
import { getAnimesWithEpisodes } from "../utils/animeDb";
import { getAnimePlaceholder, getProxyImageUrl, recoverCoverImageInHotPath } from "../utils/imageUtils";

interface HomeSectionProps {
  trendingAnimes: Anime[];
  seasonalAnimes: Anime[];
  movies: Anime[];
  latestEpisodes: Anime[];
  loading: boolean;
  onSelectAnime: (anime: Anime) => void;
  onSelectManga?: (manga: Manga) => void;
  favorites: string[];
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
  currentUser?: User | null;
  activeEpisodeId?: string | null;
  onResumeEpisode?: (animeId: string, episodeId: string) => void;
  onResumeManga?: (manga: Manga, chapterId: string) => void;
  seasonalPage?: number;
  seasonalTotalPages?: number;
  onSeasonalPageChange?: (page: number) => void;
  loadingSeasonal?: boolean;
  onNavigateTab?: (tab: string) => void;
}

export const HomeSection: React.FC<HomeSectionProps> = ({
  trendingAnimes,
  seasonalAnimes,
  movies,
  latestEpisodes,
  loading,
  onSelectAnime,
  onSelectManga,
  favorites,
  onToggleFavorite,
  currentUser = null,
  activeEpisodeId = null,
  onResumeEpisode,
  onResumeManga,
  onNavigateTab
}) => {
  const [continueWatching, setContinueWatching] = useState<any[]>([]);
  const [showAllProgress, setShowAllProgress] = useState(false);

  // Row scroll references for Netflix/Crunchyroll-style slider navigation
  const continueWatchingRef = useRef<HTMLDivElement>(null);
  const myListRef = useRef<HTMLDivElement>(null);
  const top10Ref = useRef<HTMLDivElement>(null);
  const recommendedRef = useRef<HTMLDivElement>(null);
  const seasonalRef = useRef<HTMLDivElement>(null);
  const latestRef = useRef<HTMLDivElement>(null);
  const moviesRef = useRef<HTMLDivElement>(null);
  const trendingRef = useRef<HTMLDivElement>(null);

  const scrollRow = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const { scrollLeft, clientWidth } = ref.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth * 0.85 : scrollLeft + clientWidth * 0.85;
      ref.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  // 1. Sync & Load "Seguir Viendo" playback history
  useEffect(() => {
    const loadProgressDetails = async () => {
      if (currentUser) {
        await syncAllProgressFromFirestore(currentUser);
      }

      const progressList = getAllLocalProgress(currentUser);
      const sorted = [...progressList].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      const allAnimes = getAnimesWithEpisodes();

      const mappedPromises = sorted.map(async (progress) => {
        if (progress.contentType === "manga") {
          try {
            const res = await fetch(`/api/manga-detail/${progress.animeId}`);
            if (res.ok) {
              const mangaData = await res.json();
              // Sync metadata if the saved progress lacks details or contains generic API names
              const lowerTitle = (progress.animeTitle || "").toLowerCase().trim();
              if (!progress.animeTitle || lowerTitle === "consumet" || lowerTitle === "hianime" || lowerTitle === "undefined" || lowerTitle.startsWith("consumet-") || lowerTitle.startsWith("hianime-")) {
                progress.animeTitle = mangaData.title;
              }
              if (!progress.animeCoverUrl || progress.animeCoverUrl === "") {
                progress.animeCoverUrl = mangaData.coverUrl;
              }
              return {
                manga: mangaData,
                progress,
                isManga: true
              };
            }
          } catch (e) {
            console.error("Failed to load manga details in continue watching:", e);
          }
          
          return {
            manga: {
              id: progress.animeId,
              title: progress.animeTitle || progress.animeId.replace(/-/g, " "),
              coverUrl: progress.animeCoverUrl || "",
              genres: [],
              status: "En emisión" as const,
              year: 2026,
              chaptersCount: 1,
              rating: 8.5
            },
            progress,
            isManga: true
          };
        } else {
          const normalizedId = normalizeAnimeId(progress.animeId, progress.animeTitle);
          const cleanExternalId = progress.animeId.replace(/^(consumet-|hianime-)/, "");
          let anime = allAnimes.find(a => 
            a.id === progress.animeId || 
            a.id === normalizedId ||
            (a.external_id && a.external_id === cleanExternalId)
          );

          if (!anime) {
            try {
              const res = await fetch(`/api/anime/${progress.animeId}`);
              if (res.ok) {
                anime = await res.json();
              }
            } catch (e) {
              console.error("Failed to load anime details in continue watching:", e);
            }
          }
          
          if (!anime) {
            const isMovie = progress.contentType === "movie" || progress.episodeId.toLowerCase().includes("movie") || progress.episodeId.toLowerCase().includes("pelicula");
            let sanitizedTitle = progress.animeTitle || "";
            const lowerTitle = sanitizedTitle.toLowerCase().trim();
            if (!sanitizedTitle || lowerTitle === "consumet" || lowerTitle === "hianime" || lowerTitle === "undefined" || lowerTitle.startsWith("consumet-") || lowerTitle.startsWith("hianime-")) {
              sanitizedTitle = progress.animeId.replace(/^(consumet-|hianime-|gogoanime-)/g, "").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
            }

            anime = {
              id: progress.animeId,
              title: sanitizedTitle,
              synopsis: "",
              coverUrl: progress.animeCoverUrl || "",
              bannerUrl: progress.animeCoverUrl || "",
              genres: isMovie ? ["Película"] : ["Anime"],
              status: "En emisión" as const,
              rating: 8.5,
              type: isMovie ? "Película" : "Anime",
              episodesCount: 1,
              year: 2026,
              episodes: []
            };
          } else {
            // ALWAYS use the local DB's authoritative title and cover
            // This corrects stale localStorage data from before cover fixes
            progress.animeTitle = anime.title;
            progress.animeCoverUrl = anime.coverUrl;
          }
          
          return {
            anime,
            progress,
            isManga: false
          };
        }
      });

      const resolved = await Promise.all(mappedPromises);
      setContinueWatching(resolved.filter(Boolean));
    };

    loadProgressDetails();
  }, [currentUser, activeEpisodeId]);

  const handleRemoveProgress = (e: React.MouseEvent, animeId: string) => {
    e.stopPropagation();
    const profileId = currentUser?.activeProfileId || "default";
    const cacheKey = currentUser ? `megaAnime_progress_${currentUser.id}_${profileId}` : "megaAnime_progress_guest";
    try {
      const existingRaw = safeLocalStorage.getItem(cacheKey);
      if (existingRaw) {
        const existing = JSON.parse(existingRaw);
        delete existing[animeId];
        safeLocalStorage.setItem(cacheKey, JSON.stringify(existing));
        setContinueWatching(prev => prev.filter(item => item.progress.animeId !== animeId));
      }
    } catch (err) {
      console.warn("Failed to delete progress:", err);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
    }
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // 2. "Mi Lista" (Favoritos) Row items resolution
  const myListAnimes = useMemo(() => {
    const allLocal = getAnimesWithEpisodes();
    return favorites.map(favId => {
      // Try to find in local catalog
      let found = allLocal.find(a => a.id === favId);
      if (found) return found;
      
      // Look in recently loaded trending/seasonal
      found = trendingAnimes.find(a => a.id === favId);
      if (found) return found;
      found = seasonalAnimes.find(a => a.id === favId);
      if (found) return found;
      found = movies.find(a => a.id === favId);
      if (found) return found;
      found = latestEpisodes.find(a => a.id === favId);
      if (found) return found;

      return null;
    }).filter(Boolean) as Anime[];
  }, [favorites, trendingAnimes, seasonalAnimes, movies, latestEpisodes]);

  // 3. "Porque viste [Anime]" Contextual Intelligent Recommendations
  const contextualRecommendation = useMemo(() => {
    const allLocalAndRemote = [...getAnimesWithEpisodes(), ...trendingAnimes, ...seasonalAnimes, ...movies, ...latestEpisodes];
    // Find unique items
    const uniqueMap = new Map<string, Anime>();
    allLocalAndRemote.forEach(a => uniqueMap.set(a.id, a));
    const catalogList = Array.from(uniqueMap.values());

    // Get last watched anime from continueWatching (exclude mangas)
    const lastWatched = continueWatching.find(c => !c.isManga)?.anime;
    const refAnime = lastWatched || trendingAnimes[0] || getAnimesWithEpisodes()[0];

    if (!refAnime) return null;

    const referenceGenres = refAnime.genres || [];
    const watchedIds = new Set(continueWatching.map(c => c.isManga ? c.manga.id : c.anime.id));

    // Recommend catalog items sharing genres, excluding watched ones
    const recommended = catalogList.filter(item => {
      if (item.id === refAnime.id || watchedIds.has(item.id)) return false;
      return (item.genres || []).some(g => (referenceGenres || []).includes(g));
    });

    return {
      referenceAnime: refAnime,
      list: recommended.slice(0, 12)
    };
  }, [continueWatching, trendingAnimes, seasonalAnimes, movies, latestEpisodes]);

  // 4. "Top 10 Más Vistos hoy" row items
  const top10Animes = useMemo(() => {
    return trendingAnimes.slice(0, 10);
  }, [trendingAnimes]);

  if (loading && trendingAnimes.length === 0) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-rose-500" />
          <span className="text-sm text-neutral-400 font-medium">Sincronizando con los servidores de anime...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-14 animate-fade-in pb-16">
      {/* Featured Hero Slideshow */}
      <Hero
        featuredAnimes={seasonalAnimes.slice(0, 6)}
        onSelectAnime={onSelectAnime}
        favorites={favorites}
        onToggleFavorite={(id) => onToggleFavorite({ stopPropagation: () => {} } as any, id)}
      />

      {/* SECTION: Seguir Viendo (Netflix Style Carousel) */}
      {continueWatching && continueWatching.length > 0 && (
        <section className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-1 bg-rose-500 rounded-full" />
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2 tracking-tight">
                <Play className="h-5 w-5 fill-rose-500 text-rose-500" />
                Seguir Viendo
              </h2>
            </div>
            {continueWatching.length >= 6 && (
              <button 
                onClick={() => setShowAllProgress(!showAllProgress)}
                className="text-xs text-rose-400 hover:text-rose-300 font-extrabold tracking-wider uppercase transition-colors cursor-pointer"
              >
                {showAllProgress ? "Ver menos" : `Ver todos (${continueWatching.length})`}
              </button>
            )}
          </div>
          
          {showAllProgress ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {continueWatching.map((item) => {
                const currentId = item.isManga ? item.manga.id : item.anime.id;
                const title = item.isManga ? item.manga.title : item.anime.title;
                const coverUrl = item.isManga ? item.manga.coverUrl : item.anime.coverUrl;

                return (
                  <div 
                    key={`${item.progress.episodeId || currentId}-${item.progress.updatedAt}`}
                    className="group relative bg-neutral-900 rounded-xl overflow-hidden shadow-md border border-white/5 hover:border-rose-500/20 transition-all duration-300 transform hover:-translate-y-1 flex flex-col cursor-pointer"
                    onClick={() => {
                      if (item.isManga) {
                        if (onResumeManga && item.progress.episodeId) {
                          onResumeManga(item.manga, item.progress.episodeId);
                        } else {
                          onSelectManga?.(item.manga);
                        }
                      } else {
                        if (onResumeEpisode && item.progress.episodeId) {
                          onResumeEpisode(item.anime.id, item.progress.episodeId);
                        } else {
                          onSelectAnime(item.anime);
                        }
                      }
                    }}
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-neutral-950">
                      <img 
                        src={getProxyImageUrl(coverUrl, title)} 
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const isM = item.manga ? "MANGA" : "ANIME";
                          const targetId = item.manga ? item.manga.id : item.anime.id;
                          recoverCoverImageInHotPath(e, title, targetId, isM);
                        }}
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <div className="h-10 w-10 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20">
                          <Play className="h-4 w-4 fill-white ml-0.5" />
                        </div>
                      </div>
                      <div className="absolute top-2 left-2 bg-black/80 border border-white/10 text-[9px] font-bold text-white px-1.5 py-0.5 rounded">
                        Cap. {item.progress.episodeNumber}
                      </div>
                      <button
                        onClick={(e) => handleRemoveProgress(e, currentId)}
                        className="absolute top-2 right-2 h-6 w-6 bg-black/85 hover:bg-rose-600 border border-white/10 rounded-full flex items-center justify-center text-white/80 transition-all z-20"
                        title="Quitar"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-neutral-800">
                        <div className="bg-rose-500 h-full rounded-r" style={{ width: `${item.progress.percentage}%` }} />
                      </div>
                    </div>
                    <div className="p-2.5 bg-neutral-900 flex-grow flex flex-col justify-between">
                      <h3 className="font-bold text-xs text-neutral-100 group-hover:text-rose-400 transition-colors line-clamp-1">{title}</h3>
                      <div className="flex justify-between items-center mt-1.5 text-[10px] text-neutral-400 font-medium">
                        <span>{item.isManga ? `Pág. ${Math.round(item.progress.progressSeconds)}` : formatTime(item.progress.progressSeconds)}</span>
                        <span className="font-bold text-rose-500">{item.progress.percentage}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="relative group/row">
              {/* Slider Left Arrow */}
              <button 
                onClick={() => scrollRow(continueWatchingRef, 'left')}
                className="absolute left-0 top-0 bottom-0 w-12 z-20 bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[3px] border-r border-white/5"
              >
                <ChevronLeft className="h-8 w-8 text-neutral-400 hover:text-white" />
              </button>
              
              {/* Horizontal Scroll Port */}
              <div 
                ref={continueWatchingRef}
                className="flex overflow-x-auto overflow-y-hidden gap-4 pb-4 scrollbar-hide scroll-smooth snap-x snap-mandatory px-1"
              >
                {continueWatching.map((item) => {
                  const currentId = item.isManga ? item.manga.id : item.anime.id;
                  const title = item.isManga ? item.manga.title : item.anime.title;
                  const coverUrl = item.isManga ? item.manga.coverUrl : item.anime.coverUrl;

                  return (
                    <div 
                      key={`${item.progress.episodeId || currentId}-${item.progress.updatedAt}`}
                      className="flex-shrink-0 w-[140px] sm:w-[165px] md:w-[190px] snap-start group relative bg-neutral-900 rounded-xl overflow-hidden shadow-md border border-white/5 hover:border-rose-500/20 transition-all duration-300 transform hover:-translate-y-1 flex flex-col cursor-pointer"
                      onClick={() => {
                        if (item.isManga) {
                          if (onResumeManga && item.progress.episodeId) {
                            onResumeManga(item.manga, item.progress.episodeId);
                          } else {
                            onSelectManga?.(item.manga);
                          }
                        } else {
                          if (onResumeEpisode && item.progress.episodeId) {
                            onResumeEpisode(item.anime.id, item.progress.episodeId);
                          } else {
                            onSelectAnime(item.anime);
                          }
                        }
                      }}
                    >
                      <div className="relative aspect-square w-full overflow-hidden bg-neutral-950">
                        <img 
                          src={getProxyImageUrl(coverUrl, title)} 
                          alt={title}
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const isM = item.manga ? "MANGA" : "ANIME";
                            const targetId = item.manga ? item.manga.id : item.anime.id;
                            recoverCoverImageInHotPath(e, title, targetId, isM);
                          }}
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                          <div className="h-9 w-9 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20">
                            <Play className="h-3.5 w-3.5 fill-white ml-0.5" />
                          </div>
                        </div>
                        <div className="absolute top-2 left-2 bg-black/80 border border-white/10 text-[9px] font-bold text-white px-1.5 py-0.5 rounded">
                          Cap. {item.progress.episodeNumber}
                        </div>
                        <button
                          onClick={(e) => handleRemoveProgress(e, currentId)}
                          className="absolute top-2 right-2 h-5 w-5 bg-black/85 hover:bg-rose-600 border border-white/10 rounded-full flex items-center justify-center text-white/80 transition-all z-20"
                          title="Quitar"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-neutral-800">
                          <div className="bg-rose-500 h-full rounded-r" style={{ width: `${item.progress.percentage}%` }} />
                        </div>
                      </div>
                      <div className="p-2 md:p-2.5 bg-neutral-900 flex-grow flex flex-col justify-between">
                        <h3 className="font-bold text-[11px] md:text-xs text-neutral-100 group-hover:text-rose-400 transition-colors line-clamp-1">{title}</h3>
                        <div className="flex justify-between items-center mt-1 text-[9px] md:text-[10px] text-neutral-400 font-medium">
                          <span>{item.isManga ? `Pág. ${Math.round(item.progress.progressSeconds)}` : formatTime(item.progress.progressSeconds)}</span>
                          <span className="font-bold text-rose-500">{item.progress.percentage}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Slider Right Arrow */}
              <button 
                onClick={() => scrollRow(continueWatchingRef, 'right')}
                className="absolute right-0 top-0 bottom-0 w-12 z-20 bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[3px] border-l border-white/5"
              >
                <ChevronRight className="h-8 w-8 text-neutral-400 hover:text-white" />
              </button>
            </div>
          )}
        </section>
      )}

      {/* SECTION: Top 10 Más Vistos hoy (Netflix Style Numbers) */}
      {top10Animes && top10Animes.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-1 bg-rose-500 rounded-full" />
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2 tracking-tight">
              <TrendingUp className="h-5 w-5 text-rose-400" />
              Top 10 Más Vistos Hoy
            </h2>
          </div>

          <div className="relative group/row">
            <button 
              onClick={() => scrollRow(top10Ref, 'left')}
              className="absolute left-0 top-0 bottom-0 w-12 z-20 bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[3px] border-r border-white/5"
            >
              <ChevronLeft className="h-8 w-8 text-neutral-400 hover:text-white" />
            </button>

            <div 
              ref={top10Ref}
              className="flex overflow-x-auto overflow-y-hidden gap-4 pb-4 scrollbar-hide scroll-smooth snap-x snap-mandatory px-1 select-none"
            >
              {top10Animes.map((anime, index) => (
                <div 
                  key={anime.id} 
                  className="flex-shrink-0 w-[170px] sm:w-[200px] md:w-[230px] h-[230px] sm:h-[260px] md:h-[290px] relative flex items-end pl-10 sm:pl-14 md:pl-16 snap-start group/top10 cursor-pointer"
                  onClick={() => onSelectAnime(anime)}
                >
                  {/* Giant 3D Outline Number behind the card */}
                  <div 
                    className="absolute left-[-5px] bottom-[-20px] sm:bottom-[-25px] md:bottom-[-30px] text-[130px] sm:text-[170px] md:text-[210px] font-black leading-none select-none text-transparent stroke-neutral-800 transition-all duration-300 group-hover/top10:scale-105 group-hover/top10:text-rose-500/5"
                    style={{
                      WebkitTextStroke: '2.5px rgba(244, 63, 94, 0.35)',
                      fontFamily: '"Outfit", "Impact", "Arial Black", sans-serif',
                      textShadow: '0 10px 30px rgba(0, 0, 0, 0.9)'
                    }}
                  >
                    {index + 1}
                  </div>

                  {/* Card Poster overlayed */}
                  <div className="relative z-10 w-full h-[190px] sm:h-[220px] md:h-[250px] rounded-xl overflow-hidden shadow-2xl border border-white/5 hover:border-rose-500/30 transition-all duration-300 transform group-hover/top10:-translate-y-1">
                    <img 
                      src={getProxyImageUrl(anime.coverUrl, anime.title)} 
                      alt={anime.title} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        recoverCoverImageInHotPath(e, anime.title, anime.id, "ANIME");
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent" />
                    
                    {/* Hover title & info overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3 bg-gradient-to-t from-black/95 to-transparent flex flex-col justify-end">
                      <h4 className="font-bold text-[10px] sm:text-xs text-white line-clamp-1 group-hover/top10:text-rose-400 transition-colors">{anime.title}</h4>
                      <div className="flex items-center justify-between mt-0.5 text-[8px] sm:text-[9px] text-neutral-300">
                        <span className="flex items-center text-amber-400 font-bold">
                          <Star className="h-2 w-2 mr-0.5 fill-amber-400 text-amber-400" />
                          {anime.rating}
                        </span>
                        <span>{anime.type}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => scrollRow(top10Ref, 'right')}
              className="absolute right-0 top-0 bottom-0 w-12 z-20 bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[3px] border-l border-white/5"
            >
              <ChevronRight className="h-8 w-8 text-neutral-400 hover:text-white" />
            </button>
          </div>
        </section>
      )}

      {/* SECTION: Recomendaciones Inteligentes (Porque Viste...) */}
      {contextualRecommendation && contextualRecommendation.list.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-1 bg-rose-500 rounded-full" />
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2 tracking-tight">
              <Sparkles className="h-5 w-5 text-rose-400" />
              Porque viste <span className="text-rose-500">{contextualRecommendation.referenceAnime.title}</span>
            </h2>
          </div>

          <div className="relative group/row">
            <button 
              onClick={() => scrollRow(recommendedRef, 'left')}
              className="absolute left-0 top-0 bottom-0 w-12 z-20 bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[3px] border-r border-white/5"
            >
              <ChevronLeft className="h-8 w-8 text-neutral-400 hover:text-white" />
            </button>

            <div 
              ref={recommendedRef}
              className="flex overflow-x-auto overflow-y-hidden gap-4 pb-4 scrollbar-hide scroll-smooth snap-x snap-mandatory px-1"
            >
              {contextualRecommendation.list.map((anime) => (
                <div key={anime.id} className="flex-shrink-0 w-[135px] sm:w-[160px] md:w-[185px] snap-start">
                  <AnimeCard
                    anime={anime}
                    onSelect={onSelectAnime}
                    isFavorite={favorites.includes(anime.id)}
                    onToggleFavorite={onToggleFavorite}
                  />
                </div>
              ))}
            </div>

            <button 
              onClick={() => scrollRow(recommendedRef, 'right')}
              className="absolute right-0 top-0 bottom-0 w-12 z-20 bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[3px] border-l border-white/5"
            >
              <ChevronRight className="h-8 w-8 text-neutral-400 hover:text-white" />
            </button>
          </div>
        </section>
      )}

      {/* SECTION: Mi Lista (Favoritos) */}
      {myListAnimes && myListAnimes.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-1 bg-rose-500 rounded-full" />
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2 tracking-tight">
              <ListPlus className="h-5 w-5 text-rose-400" />
              Mi Lista
            </h2>
          </div>

          <div className="relative group/row">
            <button 
              onClick={() => scrollRow(myListRef, 'left')}
              className="absolute left-0 top-0 bottom-0 w-12 z-20 bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[3px] border-r border-white/5"
            >
              <ChevronLeft className="h-8 w-8 text-neutral-400 hover:text-white" />
            </button>

            <div 
              ref={myListRef}
              className="flex overflow-x-auto overflow-y-hidden gap-4 pb-4 scrollbar-hide scroll-smooth snap-x snap-mandatory px-1"
            >
              {myListAnimes.map((anime) => (
                <div key={anime.id} className="flex-shrink-0 w-[135px] sm:w-[160px] md:w-[185px] snap-start">
                  <AnimeCard
                    anime={anime}
                    onSelect={onSelectAnime}
                    isFavorite={favorites.includes(anime.id)}
                    onToggleFavorite={onToggleFavorite}
                  />
                </div>
              ))}
            </div>

            <button 
              onClick={() => scrollRow(myListRef, 'right')}
              className="absolute right-0 top-0 bottom-0 w-12 z-20 bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[3px] border-l border-white/5"
            >
              <ChevronRight className="h-8 w-8 text-neutral-400 hover:text-white" />
            </button>
          </div>
        </section>
      )}

      {/* SECTION: Éxitos de Temporada (En Emisión) */}
      <section className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-1 bg-rose-500 rounded-full" />
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2 tracking-tight">
            <Sparkles className="h-5 w-5 text-rose-400" />
            Éxitos de Temporada (En Emisión)
          </h2>
        </div>

        <div className="relative group/row">
          <button 
            onClick={() => scrollRow(seasonalRef, 'left')}
            className="absolute left-0 top-0 bottom-0 w-12 z-20 bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[3px] border-r border-white/5"
          >
            <ChevronLeft className="h-8 w-8 text-neutral-400 hover:text-white" />
          </button>

          <div 
            ref={seasonalRef}
            className="flex overflow-x-auto overflow-y-hidden gap-4 pb-4 scrollbar-hide scroll-smooth snap-x snap-mandatory px-1"
          >
            {seasonalAnimes.map((anime) => (
              <div key={anime.id} className="flex-shrink-0 w-[135px] sm:w-[160px] md:w-[185px] snap-start">
                <AnimeCard
                  anime={anime}
                  onSelect={onSelectAnime}
                  isFavorite={favorites.includes(anime.id)}
                  onToggleFavorite={onToggleFavorite}
                />
              </div>
            ))}
          </div>

          <button 
            onClick={() => scrollRow(seasonalRef, 'right')}
            className="absolute right-0 top-0 bottom-0 w-12 z-20 bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[3px] border-l border-white/5"
          >
            <ChevronRight className="h-8 w-8 text-neutral-400 hover:text-white" />
          </button>
        </div>
      </section>

      {/* SECTION: Últimos Episodios */}
      <section className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-1 bg-rose-500 rounded-full" />
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2 tracking-tight">
            <Clock className="h-5 w-5 text-rose-400" />
            Últimos Episodios
          </h2>
        </div>

        <div className="relative group/row">
          <button 
            onClick={() => scrollRow(latestRef, 'left')}
            className="absolute left-0 top-0 bottom-0 w-12 z-20 bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[3px] border-r border-white/5"
          >
            <ChevronLeft className="h-8 w-8 text-neutral-400 hover:text-white" />
          </button>

          <div 
            ref={latestRef}
            className="flex overflow-x-auto overflow-y-hidden gap-4 pb-4 scrollbar-hide scroll-smooth snap-x snap-mandatory px-1"
          >
            {latestEpisodes.slice(0, 16).map((anime) => (
              <div key={anime.id} className="flex-shrink-0 w-[135px] sm:w-[160px] md:w-[185px] snap-start">
                <AnimeCard
                  anime={anime}
                  onSelect={onSelectAnime}
                  isFavorite={favorites.includes(anime.id)}
                  onToggleFavorite={onToggleFavorite}
                />
              </div>
            ))}
          </div>

          <button 
            onClick={() => scrollRow(latestRef, 'right')}
            className="absolute right-0 top-0 bottom-0 w-12 z-20 bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[3px] border-l border-white/5"
          >
            <ChevronRight className="h-8 w-8 text-neutral-400 hover:text-white" />
          </button>
        </div>
      </section>

      {/* SECTION: Películas de Estreno */}
      {movies && movies.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-1 bg-rose-500 rounded-full" />
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2 tracking-tight">
              <Film className="h-5 w-5 text-rose-400" />
              Películas de Estreno
            </h2>
          </div>

          <div className="relative group/row">
            <button 
              onClick={() => scrollRow(moviesRef, 'left')}
              className="absolute left-0 top-0 bottom-0 w-12 z-20 bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[3px] border-r border-white/5"
            >
              <ChevronLeft className="h-8 w-8 text-neutral-400 hover:text-white" />
            </button>

            <div 
              ref={moviesRef}
              className="flex overflow-x-auto overflow-y-hidden gap-4 pb-4 scrollbar-hide scroll-smooth snap-x snap-mandatory px-1"
            >
              {movies.map((movie) => (
                <div key={movie.id} className="flex-shrink-0 w-[135px] sm:w-[160px] md:w-[185px] snap-start">
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
              onClick={() => scrollRow(moviesRef, 'right')}
              className="absolute right-0 top-0 bottom-0 w-12 z-20 bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[3px] border-l border-white/5"
            >
              <ChevronRight className="h-8 w-8 text-neutral-400 hover:text-white" />
            </button>
          </div>
        </section>
      )}

      {/* SECTION: Tendencia Global */}
      <section className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-1 bg-rose-500 rounded-full" />
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2 tracking-tight">
            <TrendingUp className="h-5 w-5 text-rose-400" />
            Tendencia Global
          </h2>
        </div>

        <div className="relative group/row">
          <button 
            onClick={() => scrollRow(trendingRef, 'left')}
            className="absolute left-0 top-0 bottom-0 w-12 z-20 bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[3px] border-r border-white/5"
          >
            <ChevronLeft className="h-8 w-8 text-neutral-400 hover:text-white" />
          </button>

          <div 
            ref={trendingRef}
            className="flex overflow-x-auto overflow-y-hidden gap-4 pb-4 scrollbar-hide scroll-smooth snap-x snap-mandatory px-1"
          >
            {trendingAnimes.slice(10).map((anime) => (
              <div key={anime.id} className="flex-shrink-0 w-[135px] sm:w-[160px] md:w-[185px] snap-start">
                <AnimeCard
                  anime={anime}
                  onSelect={onSelectAnime}
                  isFavorite={favorites.includes(anime.id)}
                  onToggleFavorite={onToggleFavorite}
                />
              </div>
            ))}
          </div>

          <button 
            onClick={() => scrollRow(trendingRef, 'right')}
            className="absolute right-0 top-0 bottom-0 w-12 z-20 bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[3px] border-l border-white/5"
          >
            <ChevronRight className="h-8 w-8 text-neutral-400 hover:text-white" />
          </button>
        </div>
      </section>
    </div>
  );
};
