import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ArrowLeft } from 'lucide-react';
import { getProxyImageUrl, getAnimePlaceholder } from '../utils/imageUtils';
import { saveEpisodeProgress, getLocalEpisodeProgress } from '../utils/progress';
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
    fetch(`/api/manga/${mangaId}/chapters`)
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
      fetch(`/api/chapter/${selectedChapter}/pages`)
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950 overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-neutral-900 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          {selectedChapter && (
            <button 
              onClick={() => setSelectedChapter(null)}
              className="p-2 hover:bg-neutral-800 rounded-lg transition text-neutral-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h2 className="text-lg font-bold text-white truncate max-w-[200px] md:max-w-md">
            {selectedChapter ? `${mangaTitle} - ${chapters.find(c => c.id === selectedChapter)?.title}` : mangaTitle}
          </h2>
        </div>
        <button onClick={onClose} className="text-neutral-400 hover:text-white transition">
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
              <div className="text-white text-center mt-10">Cargando páginas...</div>
            ) : pages.length > 0 ? (
              <div className="flex flex-col gap-4 max-w-4xl w-full">
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
              </div>
            ) : (
              <div className="text-white text-center mt-10">No se pudieron cargar las páginas de este capítulo.</div>
            )}
          </div>
        ) : (
          <div className="p-4">
            {loading ? (
              <div className="text-white text-center mt-10">Cargando capítulos...</div>
            ) : chapters.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {chapters.map(chapter => (
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
