import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { getProxyImageUrl, getAnimePlaceholder } from '../utils/imageUtils';
import { saveEpisodeProgress, getLocalEpisodeProgress } from '../utils/progress';
import { getApiUrl } from '../utils/apiConfig';
import { User } from '../types';

interface Chapter {
  id: string;
  title: string;
  chapter: string;
}

interface MangaReaderProps {
  mangaId: string;
  mangaTitle: string;
  onClose: () => void;
  currentUser?: User | null;
  initialChapterId?: string | null;
  mangaCoverUrl?: string;
}

export const MangaReader: React.FC<MangaReaderProps> = ({ 
  mangaId, 
  mangaTitle, 
  onClose, 
  currentUser = null, 
  initialChapterId = null,
  mangaCoverUrl
}) => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(initialChapterId);
  const [pages, setPages] = useState<string[]>([]);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Fetch chapters for the manga
    fetch(getApiUrl(`/api/manga/${mangaId}/chapters`), { signal: AbortSignal.timeout(6000) })
      .then(res => res.json())
      .then(data => {
        setChapters(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching chapters:", err);
        setLoading(false);
      });
  }, [mangaId]);

  useEffect(() => {
    if (selectedChapter) {
      setPagesLoading(true);
      fetch(getApiUrl(`/api/chapter/${selectedChapter}/pages`), { signal: AbortSignal.timeout(6000) })
        .then(res => res.json())
        .then(data => {
          setPages(data);
          setPagesLoading(false);

          // Save progress
          const chapterObj = chapters.find(c => c.id === selectedChapter);
          const chapNum = chapterObj ? (parseFloat(chapterObj.chapter) || 1) : 1;

          // Default initial progress
          saveEpisodeProgress(
            mangaId,
            selectedChapter,
            chapNum,
            1, // progressSeconds (page 1)
            data.length || 1, // durationSeconds (total pages)
            currentUser,
            true, // forceFirestore
            "manga",
            mangaTitle,
            mangaCoverUrl
          );
        })
        .catch(err => {
          console.error("Error fetching pages:", err);
          setPagesLoading(false);
        });
    } else {
      setPages([]);
    }
  }, [selectedChapter, chapters, mangaId, currentUser]);

  // Restore scroll position to the last viewed page
  useEffect(() => {
    if (pages.length > 0 && selectedChapter) {
      const saved = getLocalEpisodeProgress(mangaId, currentUser);
      if (saved && saved.episodeId === selectedChapter && saved.progressSeconds > 1) {
        setTimeout(() => {
          const container = scrollContainerRef.current;
          if (container) {
            const pagePct = (saved.progressSeconds - 1) / pages.length;
            const scrollPos = pagePct * (container.scrollHeight - container.clientHeight);
            container.scrollTo({ top: scrollPos, behavior: "smooth" });
          }
        }, 300);
      }
    }
  }, [pages, selectedChapter, mangaId, currentUser]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!selectedChapter || pages.length <= 1) return;
    const target = e.currentTarget;
    const maxScroll = target.scrollHeight - target.clientHeight;
    if (maxScroll <= 0) return;
    
    const pageFraction = target.scrollTop / maxScroll;
    const pageIndex = Math.min(pages.length, Math.max(1, Math.round(pageFraction * pages.length) + 1));
    
    if (pageIndex !== currentPage) {
      setCurrentPage(pageIndex);
      
      const chapterObj = chapters.find(c => c.id === selectedChapter);
      const chapNum = chapterObj ? (parseFloat(chapterObj.chapter) || 1) : 1;

      saveEpisodeProgress(
        mangaId,
        selectedChapter,
        chapNum,
        pageIndex, // progressSeconds (current page)
        pages.length, // durationSeconds (total pages)
        currentUser,
        false, // throttled Firestore write
        "manga",
        mangaTitle,
        mangaCoverUrl
      );
    }
  };

  // Sorted chapters list (ascending numerical order by chapter number)
  const sortedChapters = React.useMemo(() => {
    return [...chapters].sort((a, b) => {
      const numA = parseFloat(a.chapter) || 0;
      const numB = parseFloat(b.chapter) || 0;
      return numA - numB;
    });
  }, [chapters]);

  const currentChapterIdx = sortedChapters.findIndex(c => c.id === selectedChapter);
  const hasPrevChapter = currentChapterIdx > 0;
  const hasNextChapter = currentChapterIdx >= 0 && currentChapterIdx < sortedChapters.length - 1;

  const handlePrevChapter = () => {
    if (hasPrevChapter) {
      setSelectedChapter(sortedChapters[currentChapterIdx - 1].id);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  };

  const handleNextChapter = () => {
    if (hasNextChapter) {
      setSelectedChapter(sortedChapters[currentChapterIdx + 1].id);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950 overflow-hidden pb-[env(safe-area-inset-bottom,0px)]">
      {/* Top Navigation Bar with Safe Area Support */}
      <div className="flex items-center justify-between p-3.5 sm:p-4 pt-[calc(0.875rem+env(safe-area-inset-top,0px))] bg-neutral-900 border-b border-white/10 shrink-0 gap-3">
        <div className="flex items-center gap-3">
          {selectedChapter && (
            <button 
              onClick={() => setSelectedChapter(null)}
              className="p-2 hover:bg-neutral-800 rounded-xl transition text-neutral-400 hover:text-white"
              title="Volver a la lista de capítulos"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex flex-col">
            {selectedChapter && <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider line-clamp-1">{mangaTitle}</span>}
            <h2 className="text-sm sm:text-base font-bold text-white truncate max-w-[160px] sm:max-w-xs md:max-w-md">
              {selectedChapter ? (sortedChapters.find(c => c.id === selectedChapter)?.title || "Capítulo") : mangaTitle}
            </h2>
          </div>
        </div>

        {/* Top Bar Chapter Controls */}
        {selectedChapter && (
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevChapter}
              disabled={!hasPrevChapter}
              className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1 border ${
                hasPrevChapter
                  ? "bg-neutral-800 hover:bg-neutral-700 text-white border-white/10 cursor-pointer"
                  : "bg-neutral-950 text-neutral-600 border-transparent cursor-not-allowed opacity-40"
              }`}
              title="Capítulo Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Anterior</span>
            </button>

            {/* Quick Chapter Selector Dropdown */}
            {sortedChapters.length > 0 && (
              <select
                value={selectedChapter || ""}
                onChange={(e) => {
                  setSelectedChapter(e.target.value);
                  if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTop = 0;
                  }
                }}
                className="bg-neutral-950 border border-white/10 text-white text-xs rounded-xl px-2.5 py-2 outline-none cursor-pointer max-w-[110px] sm:max-w-[160px] truncate"
              >
                {sortedChapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={handleNextChapter}
              disabled={!hasNextChapter}
              className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1 border ${
                hasNextChapter
                  ? "bg-rose-600 hover:bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-600/20 cursor-pointer"
                  : "bg-neutral-950 text-neutral-600 border-transparent cursor-not-allowed opacity-40"
              }`}
              title="Siguiente Capítulo"
            >
              <span className="hidden sm:inline">Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white transition">
          <X className="w-6 h-6" />
        </button>
      </div>
      
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {selectedChapter ? (
          <div className="flex flex-col items-center bg-neutral-950 p-4">
            {pagesLoading ? (
              <div className="text-white text-center mt-10">Cargando páginas del capítulo...</div>
            ) : pages.length > 0 ? (
              <div className="flex flex-col items-center gap-4 max-w-4xl w-full">
                {pages.map((page, index) => (
                  <img 
                    key={index} 
                    src={getProxyImageUrl(page)} 
                    alt={`Página ${index + 1}`} 
                    className="w-full h-auto rounded shadow-lg"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.src.includes('data:image/svg+xml')) {
                        target.src = getAnimePlaceholder(`${mangaTitle} - Pág. ${index + 1}`);
                      }
                    }}
                  />
                ))}

                {/* End of Chapter Completion & Next/Prev Navigation Footer */}
                <div className="w-full bg-neutral-900/80 border border-white/10 rounded-3xl p-6 sm:p-8 text-center space-y-6 my-8 backdrop-blur-md shadow-2xl">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-extrabold">
                      <CheckCircle className="w-4 h-4 text-rose-500" />
                      ¡Capítulo Completado!
                    </div>
                    <h3 className="text-base sm:text-lg font-extrabold text-white">
                      Has finalizado {sortedChapters.find(c => c.id === selectedChapter)?.title || 'este capítulo'}
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Continúa la lectura con el siguiente capítulo o regresa al catálogo.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={handlePrevChapter}
                      disabled={!hasPrevChapter}
                      className={`w-full sm:w-auto px-6 py-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 border ${
                        hasPrevChapter
                          ? "bg-neutral-800 hover:bg-neutral-700 text-white border-white/10 cursor-pointer"
                          : "bg-neutral-950 text-neutral-600 border-transparent cursor-not-allowed opacity-40"
                      }`}
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Capítulo Anterior</span>
                    </button>

                    <button
                      onClick={handleNextChapter}
                      disabled={!hasNextChapter}
                      className={`w-full sm:w-auto px-8 py-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 border ${
                        hasNextChapter
                          ? "bg-rose-600 hover:bg-rose-500 text-white border-rose-500 shadow-xl shadow-rose-600/30 cursor-pointer scale-105"
                          : "bg-neutral-950 text-neutral-600 border-transparent cursor-not-allowed opacity-40"
                      }`}
                    >
                      <span>Siguiente Capítulo</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    <button
                      onClick={() => setSelectedChapter(null)}
                      className="text-xs text-neutral-400 hover:text-white font-semibold transition"
                    >
                      Volver a la Lista de Capítulos
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-white text-center mt-10">No se pudieron cargar las páginas de este capítulo.</div>
            )}
          </div>
        ) : (
          <div className="p-4">
            {loading ? (
              <div className="text-white text-center mt-10">Cargando capítulos...</div>
            ) : sortedChapters.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {sortedChapters.map(chapter => (
                  <button
                    key={chapter.id}
                    onClick={() => setSelectedChapter(chapter.id)}
                    className="bg-neutral-800 hover:bg-neutral-700 text-white p-3 rounded-xl transition text-sm font-medium border border-white/5 hover:border-rose-500/30"
                  >
                    {chapter.title}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-white text-center mt-10">No se encontraron capítulos disponibles.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
