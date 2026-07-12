import React, { useState, useMemo } from 'react';
import { Manga, User } from '../types';
import { X, Star, Calendar, BookOpen, BookText, ArrowUpDown, ChevronRight } from 'lucide-react';
import { MangaReader } from './MangaReader';
import { getProxyImageUrl, getAnimePlaceholder, recoverCoverImageInHotPath } from '../utils/imageUtils';

interface MangaDetailProps {
  manga: Manga;
  onClose: () => void;
  currentUser?: User | null;
  initialChapterId?: string | null;
}

export const MangaDetail: React.FC<MangaDetailProps> = ({ 
  manga, 
  onClose, 
  currentUser = null, 
  initialChapterId = null 
}) => {
  const [showReader, setShowReader] = useState(!!initialChapterId);
  const [details, setDetails] = useState(manga);
  const [loading, setLoading] = useState(false);
  const [chapters, setChapters] = useState<any[]>([]);
  const [ascending, setAscending] = useState(false); // Default to descending (newest first) for manga
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const chaptersPerPage = 24;

  React.useEffect(() => {
    const fetchFullDetails = async () => {
      setLoading(true);
      try {
        const feedRes = await fetch(`/api/manga/${manga.id}/chapters`);
        const chaptersList = await feedRes.json();
        
        if (Array.isArray(chaptersList)) {
          setChapters(chaptersList);
          setDetails(prev => ({
            ...prev,
            chaptersCount: chaptersList.length > 0 ? chaptersList.length : prev.chaptersCount
          }));
        }
      } catch (error) {
        console.error("Error fetching full manga details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFullDetails();
  }, [manga.id]);

  const sortedChapters = useMemo(() => {
    const list = [...chapters];
    if (ascending) {
      list.reverse();
    }
    return list;
  }, [chapters, ascending]);

  const totalPages = Math.ceil(sortedChapters.length / chaptersPerPage) || 1;
  const activePage = currentPage >= totalPages ? 0 : currentPage;
  
  const paginatedChapters = useMemo(() => {
    const start = activePage * chaptersPerPage;
    const end = start + chaptersPerPage;
    return sortedChapters.slice(start, end);
  }, [sortedChapters, activePage]);

  const getPageLabel = (pageIndex: number) => {
    const startIdx = pageIndex * chaptersPerPage;
    const endIdx = Math.min(startIdx + chaptersPerPage, sortedChapters.length) - 1;
    const firstCh = sortedChapters[startIdx];
    const lastCh = sortedChapters[endIdx];
    
    if (!firstCh || !lastCh) return `Pág ${pageIndex + 1}`;
    
    const firstNum = firstCh.number !== undefined ? firstCh.number : (sortedChapters.length - startIdx);
    const lastNum = lastCh.number !== undefined ? lastCh.number : (sortedChapters.length - endIdx);
    
    return `Cap. ${Math.min(firstNum, lastNum)} - ${Math.max(firstNum, lastNum)}`;
  };

  return (
    <>
      {showReader ? (
        <MangaReader 
          mangaId={details.id} 
          mangaTitle={details.title} 
          mangaCoverUrl={details.coverUrl}
          onClose={() => {
            setShowReader(false);
            if (initialChapterId) {
              onClose();
            }
          }} 
          currentUser={currentUser} 
          initialChapterId={initialChapterId}
        />
      ) : (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/90 backdrop-blur-md overflow-y-auto animate-fade-in">
          {/* Container */}
          <div className="relative w-full max-w-4xl rounded-none md:rounded-3xl border-0 md:border border-white/5 bg-neutral-950 text-neutral-100 shadow-2xl overflow-hidden my-0 md:my-8 max-h-screen md:max-h-[92vh] flex flex-col">
            
            {/* Giant Netflix-style Immersive Banner */}
            <div className="relative h-[240px] sm:h-[320px] md:h-[380px] w-full flex-shrink-0">
              <img
                src={getProxyImageUrl(details.coverUrl, details.title)}
                alt={details.title}
                className="h-full w-full object-cover object-center filter brightness-[0.35] blur-[1px]"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  recoverCoverImageInHotPath(e, details.title, details.id, "MANGA");
                }}
              />
              {/* Bottom mask gradients */}
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/20 to-transparent" />
              
              {/* Floating Actions on Top Bar */}
              <div className="absolute top-4 left-6 right-6 flex justify-between items-center z-20">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold bg-rose-500/20 border border-rose-500/30 text-rose-400 tracking-wider uppercase">
                  Manga Oficial
                </span>
                <button
                  onClick={onClose}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-neutral-400 hover:text-white hover:scale-105 hover:bg-neutral-900 transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Banner Info Details Overlay */}
              <div className="absolute bottom-6 left-6 right-6 md:left-10 md:right-10 z-10 max-w-2xl space-y-4">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight tracking-tight drop-shadow-lg">
                  {details.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-3.5 text-xs md:text-sm text-neutral-200 font-semibold drop-shadow-md">
                  <span className="flex items-center text-amber-400">
                    <Star className="h-4.5 w-4.5 mr-1 fill-amber-400 text-amber-400" />
                    {(details.rating || 0).toFixed(1)}
                  </span>
                  <span>•</span>
                  <span className="text-neutral-300">{details.year}</span>
                  <span>•</span>
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[10px] font-bold uppercase tracking-wider">
                    {details.status}
                  </span>
                  <span>•</span>
                  <span>
                    {loading ? "Calculando..." : `${details.chaptersCount} capítulos`}
                  </span>
                </div>

                {/* Synopsis Inline & Expandable */}
                <div className="text-neutral-300 text-xs md:text-sm leading-relaxed drop-shadow">
                  <p className={isSynopsisExpanded ? "" : "line-clamp-2 md:line-clamp-3"}>
                    {details.synopsis || "Sumérgete en la asombrosa historia ilustrada de este manga popular. Sigue el viaje y descubre la gran narrativa de sus personajes."}
                  </p>
                  {details.synopsis && details.synopsis.length > 180 && (
                    <button
                      onClick={() => setIsSynopsisExpanded(!isSynopsisExpanded)}
                      className="text-rose-400 hover:text-rose-300 font-bold mt-1 text-xs cursor-pointer focus:outline-none"
                    >
                      {isSynopsisExpanded ? "Leer menos" : "Leer más"}
                    </button>
                  )}
                </div>

                {/* Call to Action Button */}
                <div className="flex items-center pt-2">
                  <button
                    onClick={() => setShowReader(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs md:text-sm tracking-wider uppercase transition shadow-lg shadow-rose-500/20 cursor-pointer hover:scale-[1.02]"
                  >
                    <BookText className="h-4.5 w-4.5 text-white" />
                    <span>Comenzar Lectura</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Content Box */}
            <div className="relative px-6 md:px-10 pb-8 flex flex-col overflow-y-auto flex-grow z-10 bg-neutral-950">
              
              {/* Genre Badges Row */}
              <div className="flex flex-wrap gap-2 py-4 border-b border-white/5">
                {(details.genres || []).map((g, idx) => (
                  <span
                    key={idx}
                    className="rounded-full bg-white/5 border border-white/5 px-3 py-1 text-xs text-neutral-300 font-medium hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/25 transition cursor-pointer"
                  >
                    {g}
                  </span>
                ))}
              </div>

              {/* Chapters List Section */}
              <div className="space-y-6 pt-6">
                <div className="flex justify-between items-center text-xs text-neutral-400">
                  <span className="font-bold uppercase tracking-wider text-neutral-500">Capítulos Disponibles</span>
                  <button
                    onClick={() => setAscending(!ascending)}
                    className="flex items-center space-x-1 hover:text-rose-400 transition cursor-pointer font-semibold"
                  >
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    <span>{ascending ? "Primero los más viejos" : "Primero los más nuevos"}</span>
                  </button>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                    <div className="text-[10px] text-neutral-400 font-extrabold uppercase tracking-wider mb-2.5">
                      Páginas de Tomos
                    </div>
                    <div className="flex overflow-x-auto pb-1 gap-2 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-rose-500/30 scrollbar-track-transparent">
                      {Array.from({ length: totalPages }).map((_, idx) => {
                        const isActive = idx === activePage;
                        return (
                          <button
                            key={idx}
                            onClick={() => setCurrentPage(idx)}
                            className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                              isActive
                                ? "bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/20"
                                : "bg-neutral-900 border-white/5 text-neutral-300 hover:bg-neutral-800 hover:text-white"
                            }`}
                          >
                            {getPageLabel(idx)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Dynamic chapters list (horizontal row list detailed style) */}
                {loading && chapters.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-rose-500" />
                    <span className="text-xs text-neutral-500 font-medium">Buscando capítulos en el feed...</span>
                  </div>
                ) : sortedChapters.length === 0 ? (
                  <div className="text-center py-10 text-neutral-500 text-sm">
                    No hay capítulos de manga disponibles todavía para esta obra.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {paginatedChapters.map((ch, idx) => {
                      const absoluteIndex = activePage * chaptersPerPage + idx + 1;
                      const formattedIndex = absoluteIndex < 10 ? `0${absoluteIndex}` : `${absoluteIndex}`;
                      
                      const chapterTitle = ch.title || `Capítulo ${ch.number || absoluteIndex}`;
                      const isRead = false; // Mock or database state

                      return (
                        <div
                          key={ch.id || idx}
                          onClick={() => {
                            // Run the reader starting with this chapter ID
                            setShowReader(true);
                          }}
                          className="group/item flex items-center justify-between p-3.5 rounded-2xl bg-neutral-900/40 border border-white/5 hover:bg-white/5 hover:border-white/10 cursor-pointer transition-all duration-300"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            {/* Number Tag */}
                            <div className="font-black text-xl text-neutral-700 group-hover/item:text-rose-500/50 transition-colors w-7 flex-shrink-0 text-center">
                              {formattedIndex}
                            </div>
                            {/* Chapter Info */}
                            <div className="min-w-0">
                              <span className="block font-bold text-xs sm:text-sm text-neutral-200 group-hover/item:text-rose-400 transition truncate">
                                {chapterTitle}
                              </span>
                              <span className="text-[9px] font-semibold text-neutral-500 block mt-0.5 uppercase tracking-wider">
                                {ch.releaseDate || "Disponible"}
                              </span>
                            </div>
                          </div>

                          {/* Quick Read Icon Button */}
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 group-hover/item:bg-rose-500 text-neutral-400 group-hover/item:text-white transition-all">
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
};
