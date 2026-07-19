import React, { useState, useMemo } from "react";
import { X, Play, Heart, Star, Calendar, ArrowUpDown, Clock, ChevronDown, BookOpen, Film, Download, CheckCircle, RefreshCw } from "lucide-react";
import { Anime, Episode, Manga, User } from "../types";
import { getAnimePlaceholder, getProxyImageUrl, recoverCoverImageInHotPath } from "../utils/imageUtils";
import { getAnimesWithEpisodes, getBaseTitle } from "../utils/animeDb";
import { syncEpisodeProgress, PlaybackProgress, syncAllEpisodesProgressFromFirestore, getCanonicalEpisodeKey, normalizeAnimeId } from "../utils/progress";
import { saveEpisodeDownload, isEpisodeDownloaded, deleteEpisodeDownload } from "../utils/downloadDb";
import { collection, query, where, orderBy, getDocs, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";


interface AnimeDetailProps {
  anime: Anime;
  onClose: () => void;
  onPlayEpisode: (episodeId: string) => void;
  isFavorite: boolean;
  onToggleFavorite: (animeId: string) => void;
  onSelectAnime?: (anime: Anime) => void;
  onSelectManga?: (manga: Manga) => void;
  currentUser?: User | null;
}

export default function AnimeDetail({
  anime: initialAnime,
  onClose,
  onPlayEpisode,
  isFavorite,
  onToggleFavorite,
  onSelectAnime,
  onSelectManga,
  currentUser = null
}: AnimeDetailProps) {
  const [activeTab, setActiveTab] = useState<"info" | "capitulos" | "reseñas">("capitulos"); // Default to chapters like Crunchyroll/Netflix detail views
  const [ascending, setAscending] = useState(true);
  const [currentAnime, setCurrentAnime] = useState<Anime>(initialAnime);
  const [showSeasonSelector, setShowSeasonSelector] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);

  // Downloads states
  const [downloadStates, setDownloadStates] = useState<Record<string, "idle" | "downloading" | "downloaded">>({});
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});

  const [playbackProgress, setPlaybackProgress] = useState<PlaybackProgress | null>(null);
  const [allProgress, setAllProgress] = useState<Record<string, PlaybackProgress>>({});

  // Reviews & Comments states
  const [reviews, setReviews] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState("");

  // Load reviews on anime change
  React.useEffect(() => {
    async function loadReviews() {
      if (!currentAnime || !currentAnime.id) return;
      try {
        const q = query(
          collection(db, "reviews"),
          where("animeId", "==", currentAnime.id),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        const list: any[] = [];
        snapshot.forEach(doc => {
          list.push({ id: doc.id, ...doc.data() });
        });
        setReviews(list);
      } catch (err) {
        console.warn("Firestore reviews load failed, falling back to localStorage:", err);
        try {
          const cached = localStorage.getItem("megaAnime_local_reviews");
          if (cached) {
            const allLocal = JSON.parse(cached);
            const matching = allLocal.filter((r: any) => r.animeId === currentAnime.id);
            setReviews(matching);
          } else {
            setReviews([]);
          }
        } catch (e) {
          setReviews([]);
        }
      }
    }
    loadReviews();
  }, [currentAnime?.id]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError("");
    const commentText = newComment.trim();
    if (!commentText) {
      setReviewError("Por favor escribe un comentario.");
      return;
    }
    if (!currentUser) {
      setReviewError("Debes iniciar sesión para escribir una reseña.");
      return;
    }

    setSubmittingReview(true);
    const newRev = {
      animeId: currentAnime.id,
      userId: currentUser.id,
      username: currentUser.username || currentUser.email.split("@")[0],
      avatarUrl: currentUser.profiles?.find(p => p.id === currentUser.activeProfileId)?.avatarUrl || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150&h=150&fit=crop",
      comment: commentText,
      rating: newRating,
      createdAt: new Date().toISOString()
    };

    try {
      const docRef = await addDoc(collection(db, "reviews"), newRev);
      const addedReview = { id: docRef.id, ...newRev };
      setReviews(prev => [addedReview, ...prev]);
      setNewComment("");
      setNewRating(5);
    } catch (err) {
      console.warn("Firestore save review failed, saving to localStorage fallback:", err);
      try {
        const addedReview = { id: `local_${Date.now()}`, ...newRev };
        const cached = localStorage.getItem("megaAnime_local_reviews");
        const allLocal = cached ? JSON.parse(cached) : [];
        allLocal.unshift(addedReview);
        localStorage.setItem("megaAnime_local_reviews", JSON.stringify(allLocal));
        setReviews(prev => [addedReview, ...prev]);
        setNewComment("");
        setNewRating(5);
      } catch (e) {
        setReviewError("No se pudo guardar la reseña. Inténtalo de nuevo.");
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  const averageStars = React.useMemo(() => {
    if (reviews.length === 0) {
      return currentAnime.rating ? Math.round((currentAnime.rating / 2) * 10) / 10 : 4.5;
    }
    const total = reviews.reduce((sum, r) => sum + r.rating, 0);
    return Math.round((total / reviews.length) * 10) / 10;
  }, [reviews, currentAnime.rating]);


  // Sync and load viewing progress
  React.useEffect(() => {
    async function loadProgress() {
      if (currentAnime && currentAnime.id) {
        const progress = await syncEpisodeProgress(currentAnime.id, currentUser, currentAnime.title);
        setPlaybackProgress(progress);
      }
    }
    loadProgress();
  }, [currentAnime.id, currentUser]);

  // Load all progress to map individual episodes
  React.useEffect(() => {
    async function loadAllEpisodeProgress() {
      const progressMap = await syncAllEpisodesProgressFromFirestore(currentUser);
      setAllProgress(progressMap);
    }
    loadAllEpisodeProgress();
  }, [currentUser, playbackProgress]);

  // Reset page index when anime or order changes
  React.useEffect(() => {
    setCurrentPage(0);
  }, [currentAnime.id, ascending]);

  // Sync state if props change (e.g. fresh details loaded)
  React.useEffect(() => {
    if (initialAnime && initialAnime.title) {
      setCurrentAnime(initialAnime);
    }
  }, [initialAnime]);

  // Fetch fresh details for currentAnime if its episodes are empty
  React.useEffect(() => {
    if (currentAnime && currentAnime.id && (!currentAnime.episodes || currentAnime.episodes.length === 0)) {
      fetch(`/api/anime/${currentAnime.id}`)
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            setCurrentAnime(prev => {
              if (prev.id !== currentAnime.id) return prev;
              const merged = {
                ...prev,
                ...data,
                seasons: prev.seasons || data.seasons,
              };
              return merged;
            });
          }
        })
        .catch(err => console.warn("Failed to fetch season details in AnimeDetail:", err));
    }
  }, [currentAnime.id, onSelectAnime]);

  // Load all anime once
  const [allAnime] = useState(() => getAnimesWithEpisodes());

  // Find related seasons
  const relatedSeasons = useMemo(() => {
    if (initialAnime.seasons && initialAnime.seasons.length > 1) {
      return initialAnime.seasons;
    }
    if (currentAnime.seasons && currentAnime.seasons.length > 1) {
      return currentAnime.seasons;
    }
    const baseTitle = getBaseTitle(currentAnime.title).toLowerCase().trim();
    if (baseTitle) {
      const localMatches = allAnime.filter(a => getBaseTitle(a.title).toLowerCase().trim() === baseTitle);
      if (localMatches.length > 1) {
        return localMatches;
      }
    }
    return [];
  }, [currentAnime, initialAnime, allAnime]);

  // Generate episodes list
  const episodeList = useMemo(() => {
    const totalCount = currentAnime.episodesCount || (currentAnime.episodes && currentAnime.episodes.length) || 12;
    const list: Episode[] = [];
    
    // Create a map of existing real episodes by number
    const realEpisodes = currentAnime.episodes || [];
    const realEpMap = new Map<number, Episode>();
    realEpisodes.forEach(ep => {
      if (ep.number !== undefined) {
        realEpMap.set(ep.number, ep);
      }
    });

    for (let i = 1; i <= totalCount; i++) {
      if (realEpMap.has(i)) {
        list.push(realEpMap.get(i)!);
      } else {
        list.push({
          id: `${currentAnime.id}-ep-${i}`,
          title: `Episodio ${i}`,
          number: i,
          animeId: currentAnime.id,
          animeTitle: currentAnime.title,
          coverUrl: currentAnime.coverUrl,
        });
      }
    }
    return list;
  }, [currentAnime]);

  const sortedEpisodeList = useMemo(() => {
    const list = [...episodeList];
    if (!ascending) {
      list.reverse();
    }
    return list;
  }, [episodeList, ascending]);

  const episodesPerPage = 20;
  const totalPages = Math.ceil(sortedEpisodeList.length / episodesPerPage);
  const activePage = currentPage >= totalPages ? 0 : currentPage;

  const paginatedEpisodes = useMemo(() => {
    const start = activePage * episodesPerPage;
    const end = start + episodesPerPage;
    return sortedEpisodeList.slice(start, end);
  }, [sortedEpisodeList, activePage]);

  const getPageLabel = (pageIndex: number) => {
    const startIdx = pageIndex * episodesPerPage;
    const endIdx = Math.min(startIdx + episodesPerPage, sortedEpisodeList.length) - 1;
    const firstEp = sortedEpisodeList[startIdx];
    const lastEp = sortedEpisodeList[endIdx];
    
    if (!firstEp || !lastEp) return `Pág ${pageIndex + 1}`;
    
    const firstNum = firstEp.number;
    const lastNum = lastEp.number;
    
    if (firstNum !== undefined && lastNum !== undefined) {
      if (firstNum === lastNum) return `Cap. ${firstNum}`;
      return `${Math.min(firstNum, lastNum)} - ${Math.max(firstNum, lastNum)}`;
    }
    
    return `${startIdx + 1} - ${endIdx + 1}`;
  };

  // Load download status for current paginated episodes
  React.useEffect(() => {
    async function checkDownloads() {
      const states: Record<string, "idle" | "downloading" | "downloaded"> = {};
      for (const ep of paginatedEpisodes) {
        const isDownloaded = await isEpisodeDownloaded(ep.id);
        states[ep.id] = isDownloaded ? "downloaded" : "idle";
      }
      setDownloadStates(prev => ({ ...prev, ...states }));
    }
    checkDownloads();
  }, [paginatedEpisodes]);

  const handleDownloadEpisode = async (e: React.MouseEvent, ep: Episode) => {
    e.stopPropagation();
    const epId = ep.id;
    
    if (downloadStates[epId] === "downloaded") {
      if (confirm(`¿Deseas eliminar la descarga del capítulo ${ep.number}?`)) {
        await deleteEpisodeDownload(epId);
        setDownloadStates(prev => ({ ...prev, [epId]: "idle" }));
      }
      return;
    }

    if (downloadStates[epId] === "downloading") return;

    setDownloadStates(prev => ({ ...prev, [epId]: "downloading" }));
    setDownloadProgress(prev => ({ ...prev, [epId]: 0 }));

    try {
      // 1. Resolve direct download link
      let downloadUrl = "https://www.w3schools.com/html/mov_bbb.mp4"; // Stable public video fallback
      
      try {
        const res = await fetch(`/api/episode/${encodeURIComponent(epId)}`);
        if (res.ok) {
          const data = await res.json();
          const directServer = data.videoServers?.find((s: any) => {
            const lower = s.url.toLowerCase();
            return lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.includes("commondatastorage");
          });
          if (directServer) {
            downloadUrl = directServer.url;
          }
        }
      } catch (err) {
        console.warn("Could not retrieve custom video server for download, using fallback sample video", err);
      }

      // 2. Perform direct progressive fetch download via CORS-free proxy
      const response = await fetch(`/api/download-proxy?url=${encodeURIComponent(downloadUrl)}`);
      if (!response.ok) throw new Error("Network response was not ok");
      
      const contentLength = response.headers.get("content-length");
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 10 * 1024 * 1024; // fallback 10MB
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Could not get response stream reader");

      let receivedBytes = 0;
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
          chunks.push(value);
          receivedBytes += value.length;
          const pct = Math.min(99, Math.round((receivedBytes / totalBytes) * 100));
          setDownloadProgress(prev => ({ ...prev, [epId]: pct }));
        }
      }

      const videoBlob = new Blob(chunks, { type: "video/mp4" });
      const sizeMB = Math.round((videoBlob.size / (1024 * 1024)) * 10) / 10;

      // 3. Save download to IndexedDB
      await saveEpisodeDownload(
        {
          id: epId,
          animeId: currentAnime.id,
          animeTitle: currentAnime.title,
          episodeNumber: ep.number,
          episodeTitle: ep.title && typeof ep.title === "string" ? ep.title.replace(currentAnime.title || "", "").replace(/^-/, "").trim() : `Episodio ${ep.number}`,
          coverUrl: ep.coverUrl || currentAnime.coverUrl,
          fileSizeMB: sizeMB || 10.5,
          downloadedAt: new Date().toISOString(),
        },
        videoBlob
      );

      setDownloadProgress(prev => ({ ...prev, [epId]: 100 }));
      setDownloadStates(prev => ({ ...prev, [epId]: "downloaded" }));
    } catch (err) {
      console.error("Download failed:", err);
      alert("Error al descargar el episodio. Por favor, inténtalo de nuevo.");
      setDownloadStates(prev => ({ ...prev, [epId]: "idle" }));
    }
  };

  const isMovie = currentAnime.type === "Película" || currentAnime.type === "Movie";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
      {/* Container */}
      <div className="relative w-full max-w-5xl rounded-none md:rounded-3xl border-0 md:border border-white/5 bg-neutral-950 text-neutral-100 shadow-2xl overflow-hidden my-0 md:my-8 max-h-screen md:max-h-[92vh] flex flex-col">
        
        {/* Giant Netflix-style Immersive Banner */}
        <div className="relative h-[280px] sm:h-[380px] md:h-[440px] w-full flex-shrink-0">
          <img
            src={getProxyImageUrl(currentAnime.bannerUrl || currentAnime.coverUrl, currentAnime.title)}
            alt={currentAnime.title}
            className="h-full w-full object-cover object-center filter brightness-[0.4]"
            referrerPolicy="no-referrer"
            onError={(e) => {
              recoverCoverImageInHotPath(e, currentAnime.title, currentAnime.id);
            }}
          />
          {/* Bottom mask gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/20 to-transparent" />
          
          {/* Floating Actions on Top Bar */}
          <div className="absolute top-4 left-6 right-6 flex justify-between items-center z-20">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold bg-rose-500/20 border border-rose-500/30 text-rose-400 tracking-wider uppercase">
              {currentAnime.type === "Película" ? "Película de Anime" : "Serie de Anime"}
            </span>
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-neutral-400 hover:text-white hover:scale-105 hover:bg-neutral-900 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Banner Info Details Overlay */}
          <div className="absolute bottom-6 left-6 right-6 md:left-12 md:right-12 z-10 max-w-3xl space-y-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight tracking-tight drop-shadow-lg">
              {currentAnime.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-3.5 text-xs md:text-sm text-neutral-200 font-semibold drop-shadow-md">
              <span className="flex items-center text-amber-400">
                <Star className="h-4.5 w-4.5 mr-1 fill-amber-400 text-amber-400" />
                {(currentAnime.rating || 0).toFixed(1)}
              </span>
              <span>•</span>
              <span className="text-neutral-300">{currentAnime.year}</span>
              <span>•</span>
              <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[10px] font-bold uppercase tracking-wider">
                {currentAnime.status}
              </span>
              <span>•</span>
              <span>
                {isMovie ? "1 hora 45m" : `${currentAnime.episodesCount} episodios`}
              </span>
            </div>

            {/* Synopsis Inline & Expandable */}
            <div className="text-neutral-300 text-xs md:text-sm leading-relaxed drop-shadow max-w-2xl">
              <p className={isSynopsisExpanded ? "" : "line-clamp-2 md:line-clamp-3"}>
                {currentAnime.synopsis || "Explora el maravilloso mundo de este anime. Conoce las historias de sus personajes, batallas y el destino de su gran viaje animado."}
              </p>
              {currentAnime.synopsis && currentAnime.synopsis.length > 180 && (
                <button
                  onClick={() => setIsSynopsisExpanded(!isSynopsisExpanded)}
                  className="text-rose-400 hover:text-rose-300 font-bold mt-1 text-xs cursor-pointer focus:outline-none"
                >
                  {isSynopsisExpanded ? "Ver menos" : "Ver más"}
                </button>
              )}
            </div>

            {/* Call to Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => {
                  const targetId = isMovie 
                    ? (episodeList[0]?.id || `${currentAnime.id}-ep-1`) 
                    : (episodeList[0]?.id || `${currentAnime.id}-ep-1`);
                  onPlayEpisode(targetId);
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs md:text-sm tracking-wider uppercase transition shadow-lg shadow-rose-500/20 cursor-pointer hover:scale-[1.02]"
              >
                <Play className="h-4.5 w-4.5 fill-white text-white" />
                <span>{isMovie ? "Ver Película" : "Reproducir E1"}</span>
              </button>

              <button
                onClick={() => onToggleFavorite(currentAnime.id)}
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl border font-bold text-xs md:text-sm tracking-wider uppercase transition cursor-pointer ${
                  isFavorite
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                    : "bg-white/5 border-white/10 text-neutral-200 hover:bg-white/10"
                }`}
              >
                <Heart className={`h-4.5 w-4.5 ${isFavorite ? "fill-rose-400" : ""}`} />
                <span>{isFavorite ? "En tu Lista" : "Añadir a mi Lista"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Box */}
        <div className="relative px-6 md:px-12 pb-8 flex flex-col overflow-y-auto flex-grow z-10 bg-neutral-950">
          
          {/* Genre Badges Row */}
          <div className="flex flex-wrap gap-2 py-4 border-b border-white/5">
            {(currentAnime.genres || []).map((g, idx) => (
              <span
                key={idx}
                className="rounded-full bg-white/5 border border-white/5 px-3 py-1 text-xs text-neutral-300 font-medium hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/25 transition cursor-pointer"
              >
                {g}
              </span>
            ))}
          </div>

          {/* Tabs Nav Bar */}
          <div className="flex border-b border-white/5 text-sm font-semibold justify-between items-center py-2 flex-shrink-0">
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab("capitulos")}
                className={`py-3 px-4 transition-all border-b-2 -mb-px flex items-center space-x-2 cursor-pointer ${
                  activeTab === "capitulos"
                    ? "border-rose-500 text-rose-400 font-bold"
                    : "border-transparent text-neutral-400 hover:text-white"
                }`}
              >
                <span>{isMovie ? "Película" : "Episodios"}</span>
                <span className="text-xs bg-neutral-800 px-1.5 py-0.5 rounded-full text-neutral-400">
                  {isMovie ? 1 : currentAnime.episodesCount}
                </span>
              </button>
              
              <button
                onClick={() => setActiveTab("info")}
                className={`py-3 px-4 transition-all border-b-2 -mb-px cursor-pointer ${
                  activeTab === "info"
                    ? "border-rose-500 text-rose-400 font-bold"
                    : "border-transparent text-neutral-400 hover:text-white"
                }`}
              >
                Contenido Relacionado
              </button>

              <button
                onClick={() => setActiveTab("reseñas")}
                className={`py-3 px-4 transition-all border-b-2 -mb-px cursor-pointer ${
                  activeTab === "reseñas"
                    ? "border-rose-500 text-rose-400 font-bold"
                    : "border-transparent text-neutral-400 hover:text-white"
                }`}
              >
                Reseñas
              </button>

            </div>

            {/* Season Selector Dropdown */}
            {relatedSeasons.length > 0 && !isMovie && (
              <div className="relative">
                <button
                  onClick={() => setShowSeasonSelector(!showSeasonSelector)}
                  className="flex items-center space-x-1.5 text-xs text-rose-400 font-bold bg-rose-500/10 px-3 py-2 rounded-xl border border-rose-500/20 shadow-md hover:bg-rose-500/20 transition cursor-pointer"
                >
                  <span>
                    {(() => {
                      const activeIndex = relatedSeasons.findIndex(s => s.id === currentAnime.id);
                      const activeSeason = relatedSeasons[activeIndex >= 0 ? activeIndex : 0];
                      if (activeSeason) {
                        const matchTemp = activeSeason.title.match(/(Temporada\s+\d+|Season\s+\d+|Final\s+Season|Part\s+\d+|Parte\s+\d+)/i);
                        if (matchTemp) return matchTemp[1];
                      }
                      return `Temporada ${(activeIndex >= 0 ? activeIndex : 0) + 1}`;
                    })()}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {showSeasonSelector && (
                  <div className="absolute right-0 top-full mt-2 bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl p-1.5 z-50 w-52 max-h-60 overflow-y-auto">
                    {relatedSeasons.map((season, idx) => {
                      const isSelected = season.id === currentAnime.id;
                      let seasonName = `Temporada ${idx + 1}`;
                      const matchTemp = season.title.match(/(Temporada\s+\d+|Season\s+\d+|Final\s+Season|Part\s+\d+|Parte\s+\d+)/i);
                      if (matchTemp) {
                        seasonName = matchTemp[1];
                      }
                      return (
                        <button
                          key={season.id}
                          onClick={() => {
                            setCurrentAnime(season);
                            setShowSeasonSelector(false);
                            if (onSelectAnime) {
                              onSelectAnime(season);
                            }
                          }}
                          className={`w-full text-left px-3 py-2.5 text-xs rounded-xl transition cursor-pointer ${
                            isSelected
                              ? "bg-rose-500/20 text-rose-400 font-bold"
                              : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
                          }`}
                          title={season.title}
                        >
                          {seasonName} ({season.year})
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dynamic Tab Body content */}
          <div className="flex-grow overflow-y-auto pt-4 pr-1">
            {activeTab === "capitulos" ? (
              <div className="space-y-6">
                {/* Series Episodes Listing Header */}
                {!isMovie && (
                  <div className="flex justify-between items-center text-xs text-neutral-400">
                    <span className="font-bold uppercase tracking-wider text-neutral-500">Capítulos de la Temporada</span>
                    <button
                      onClick={() => setAscending(!ascending)}
                      className="flex items-center space-x-1 hover:text-rose-400 transition cursor-pointer font-semibold"
                    >
                      <ArrowUpDown className="h-3.5 w-3.5" />
                      <span>{ascending ? "Primero los más viejos" : "Primero los más nuevos"}</span>
                    </button>
                  </div>
                )}

                {/* Episodes Pagination Bar */}
                {totalPages > 1 && !isMovie && (
                  <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                    <div className="text-[10px] text-neutral-400 font-extrabold uppercase tracking-wider mb-2.5">
                      Páginas de Capítulos
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

                {/* Episodes List (Netflix-style horizontal rows detailed) */}
                {sortedEpisodeList.length === 0 ? (
                  <div className="text-center py-12 text-neutral-500 text-sm">
                    No hay capítulos disponibles todavía.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paginatedEpisodes.map((ep, idx) => {
                      const absoluteIndex = activePage * episodesPerPage + idx + 1;
                      const formattedIndex = absoluteIndex < 10 ? `0${absoluteIndex}` : `${absoluteIndex}`;
                      
                      let episodeLabel = `Capítulo ${ep.number}`;
                      if (isMovie) {
                        episodeLabel = `Película Completa`;
                      } else if (ep.title && typeof ep.title === "string") {
                        const cleanEpTitle = ep.title.replace(currentAnime.title || "", "").replace(/^-/, "").trim();
                        if (cleanEpTitle && !cleanEpTitle.toLowerCase().includes("episodio") && !cleanEpTitle.toLowerCase().includes("capítulo") && !cleanEpTitle.toLowerCase().includes("cap")) {
                          episodeLabel = cleanEpTitle;
                        }
                      }

                      const epProg = allProgress[ep.id] 
                        || allProgress[getCanonicalEpisodeKey(normalizeAnimeId(currentAnime.id, currentAnime.title), ep.number || 1)];

                      return (
                        <div
                          key={ep.id}
                          onClick={() => onPlayEpisode(ep.id)}
                          className="group/item flex items-start gap-4 p-4 rounded-2xl bg-neutral-900/40 border border-white/5 hover:bg-white/5 hover:border-white/10 cursor-pointer transition-all duration-300"
                        >
                          {/* Index Number */}
                          {!isMovie && (
                            <div className="hidden sm:flex items-center justify-center font-black text-2xl md:text-3xl text-neutral-700 group-hover/item:text-rose-500/50 transition-colors w-10 flex-shrink-0 self-center">
                              {formattedIndex}
                            </div>
                          )}

                          {/* 16:9 Aspect Video Thumbnail */}
                          <div className="relative aspect-video w-32 sm:w-44 flex-shrink-0 overflow-hidden rounded-xl bg-neutral-900 border border-white/10 hover:border-rose-500/30 transition-colors">
                            <img
                               src={getProxyImageUrl(currentAnime.bannerUrl || currentAnime.coverUrl, currentAnime.title)}
                               alt={(ep.title && typeof ep.title === "string") ? ep.title : `Episodio ${ep.number}`}
                               className="h-full w-full object-cover transition-transform duration-500 group-hover/item:scale-105"
                               referrerPolicy="no-referrer"
                               onError={(e) => {
                                 e.currentTarget.onerror = null;
                                 e.currentTarget.src = getAnimePlaceholder(currentAnime.title, true);
                               }}
                            />
                            {/* Hover Play Backdrop Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/item:opacity-100 transition-opacity">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/30 hover:scale-110 transition-transform">
                                <Play className="h-5 w-5 fill-white text-white ml-0.5" />
                              </div>
                            </div>
                            
                            {/* Running Progress Bar (Netflix Red) */}
                            {epProg && epProg.percentage > 0 && (
                              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-neutral-800">
                                <div 
                                  className="h-full bg-rose-500 transition-all duration-300" 
                                  style={{ width: `${epProg.percentage}%` }}
                                />
                              </div>
                            )}
                          </div>

                          {/* Episode Title, Meta & Synopsis */}
                          <div className="flex-grow min-w-0 space-y-1 self-center">
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <h4 className="font-bold text-xs sm:text-sm text-neutral-200 group-hover/item:text-rose-400 transition truncate">
                                {!isMovie && <span className="text-neutral-500 font-extrabold mr-1.5">Capítulo {ep.number}</span>}
                                {episodeLabel}
                              </h4>
                              <span className="text-[10px] font-semibold text-neutral-500">
                                {ep.releaseDate || "Disponible"}
                              </span>
                            </div>
                            
                            {/* Progress text indicator */}
                            {epProg && epProg.percentage > 0 && (
                              <span className="inline-block text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                                {epProg.percentage}% visto ({Math.round(epProg.position / 60)} min)
                              </span>
                            )}

                            <p className="hidden sm:block text-xs text-neutral-500 leading-relaxed line-clamp-2">
                              {currentAnime.synopsis 
                                ? `Disfruta del capítulo ${ep.number} de ${currentAnime.title}. Sigue el emocionante destino de la historia en esta maravillosa producción de anime.` 
                                : "No hay sinopsis específica disponible para este episodio. Reproduce para comenzar la aventura."}
                            </p>
                          </div>

                          {/* Descarga Offline Button (Netflix / Crunchyroll style) */}
                          <div className="flex-shrink-0 self-center pl-2 z-10">
                            {downloadStates[ep.id] === "downloaded" ? (
                              <button
                                onClick={(e) => handleDownloadEpisode(e, ep)}
                                className="h-9 w-9 rounded-xl flex items-center justify-center bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition shadow cursor-pointer"
                                title="Descargado. Haz clic para eliminar."
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                            ) : downloadStates[ep.id] === "downloading" ? (
                              <div className="relative h-9 w-9 flex items-center justify-center bg-white/5 rounded-xl border border-white/5">
                                <RefreshCw className="h-4 w-4 text-rose-500 animate-spin" />
                                <span className="absolute -bottom-1.5 bg-rose-500 text-white text-[8px] font-black px-1 rounded shadow">
                                  {downloadProgress[ep.id]}%
                                </span>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => handleDownloadEpisode(e, ep)}
                                className="h-9 w-9 rounded-xl flex items-center justify-center bg-white/5 hover:bg-rose-500 text-neutral-400 hover:text-white border border-white/5 hover:border-rose-500 transition cursor-pointer"
                                title="Descargar offline"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : activeTab === "info" ? (
              // RELATED TAB
              <div className="space-y-6">
                {relatedSeasons.filter(s => s.type === "Película").length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4 flex items-center">
                      <Film className="h-4 w-4 mr-2 text-rose-500" />
                      Películas Relacionadas
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {relatedSeasons.filter(s => s.type === "Película").map((movie) => (
                        <div 
                          key={movie.id}
                          onClick={() => {
                            setCurrentAnime(movie);
                            if (onSelectAnime) onSelectAnime(movie);
                          }}
                          className="group cursor-pointer bg-neutral-900/50 border border-white/5 rounded-2xl overflow-hidden hover:border-rose-500/50 transition-all duration-300"
                        >
                          <div className="relative aspect-[3/4] overflow-hidden">
                            <img 
                              src={getProxyImageUrl(movie.coverUrl, movie.title)} 
                              alt={movie.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                recoverCoverImageInHotPath(e, movie.title, movie.id, "ANIME");
                              }}
                            />
                            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase">
                              Película
                            </div>
                          </div>
                          <div className="p-3">
                            <h5 className="text-xs font-bold text-neutral-200 line-clamp-1 group-hover:text-rose-400 transition-colors">
                              {movie.title}
                            </h5>
                            <span className="text-[10px] text-neutral-500 font-semibold">{movie.year}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {currentAnime.relatedMangas && currentAnime.relatedMangas.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4 flex items-center">
                      <BookOpen className="h-4 w-4 mr-2 text-rose-500" />
                      Manga Original
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {currentAnime.relatedMangas.map((manga) => (
                        <div 
                          key={manga.id}
                          className="group cursor-pointer bg-neutral-900/50 border border-white/5 rounded-2xl overflow-hidden hover:border-rose-500/50 transition-all duration-300"
                          onClick={() => onSelectManga?.(manga)}
                        >
                          <div className="relative overflow-hidden" style={{ aspectRatio: "3/4" }}>
                            <img 
                              src={getProxyImageUrl(manga.coverUrl, manga.title)} 
                              alt={manga.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                recoverCoverImageInHotPath(e, manga.title, manga.id, "MANGA");
                              }}
                            />
                            <div className="absolute top-2 right-2 bg-rose-500/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase">
                              Manga
                            </div>
                          </div>
                          <div className="p-3">
                            <h5 className="text-xs font-bold text-neutral-200 line-clamp-1 group-hover:text-rose-400 transition-colors">
                              {manga.title}
                            </h5>
                            <span className="text-[10px] text-neutral-500 font-semibold">{manga.year}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // REVIEWS/COMMENTS TAB
              <div className="space-y-6 animate-fade-in">
                {/* Community Score Card */}
                <div className="flex flex-col sm:flex-row items-center justify-between p-6 rounded-2xl bg-neutral-900/40 border border-white/5 gap-6">
                  <div className="text-center sm:text-left space-y-1">
                    <h3 className="text-base font-bold text-white uppercase tracking-wider">Puntuación de la Comunidad</h3>
                    <p className="text-xs text-neutral-400">¿Qué opinan otros fanáticos de {currentAnime.title}?</p>
                  </div>
                  <div className="flex items-center gap-4 bg-neutral-950 px-6 py-4 rounded-xl border border-white/5">
                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 font-extrabold text-xl">
                      {averageStars}
                    </div>
                    <div>
                      <div className="flex text-amber-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            className={`h-4 w-4 ${i < Math.round(averageStars) ? 'fill-amber-400 text-amber-400' : 'text-neutral-700'}`} 
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider block mt-1">
                        {reviews.length} {reviews.length === 1 ? 'reseña' : 'reseñas'} en total
                      </span>
                    </div>
                  </div>
                </div>

                {/* Form to submit review */}
                <form onSubmit={handleSubmitReview} className="p-6 rounded-2xl bg-neutral-900/40 border border-white/5 space-y-4">
                  <h4 className="text-sm font-bold text-neutral-200">Escribe tu opinión</h4>
                  
                  {/* Rating star selector */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-neutral-400">Tu calificación:</span>
                    <div className="flex gap-1.5">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const starValue = i + 1;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setNewRating(starValue)}
                            className="text-neutral-600 hover:scale-110 transition-transform cursor-pointer"
                          >
                            <Star 
                              className={`h-5 w-5 ${starValue <= newRating ? 'fill-amber-400 text-amber-400' : 'text-neutral-700'}`} 
                            />
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-xs font-bold text-amber-400">{newRating} {newRating === 1 ? 'Estrella' : 'Estrellas'}</span>
                  </div>

                  {/* Comment Input */}
                  <div className="space-y-1.5">
                    <textarea
                      placeholder="¿Qué te pareció este anime? Escribe tu reseña..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      maxLength={1000}
                      rows={3}
                      className="w-full bg-neutral-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white placeholder-neutral-500 focus:border-rose-500 outline-none resize-none leading-relaxed"
                    />
                    <div className="flex justify-between items-center text-[10px] text-neutral-500 font-semibold">
                      <span>Máximo 1000 caracteres</span>
                      <span>{newComment.length}/1000</span>
                    </div>
                  </div>

                  {reviewError && (
                    <p className="text-xs text-rose-500 font-semibold">{reviewError}</p>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2"
                    >
                      {submittingReview ? (
                        <>
                          <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Enviando...</span>
                        </>
                      ) : (
                        <span>Publicar Reseña</span>
                      )}
                    </button>
                  </div>
                </form>

                {/* Reviews List */}
                <div className="space-y-4">
                  <h4 className="text-xs font-extrabold text-neutral-400 uppercase tracking-widest font-mono">Comentarios Recientes</h4>
                  {reviews.length === 0 ? (
                    <div className="text-center py-8 text-neutral-600 text-xs">
                      Aún no hay reseñas. ¡Sé el primero en opinar!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {reviews.map((rev) => (
                        <div key={rev.id} className="p-4 rounded-xl bg-neutral-900/30 border border-white/5 space-y-2.5 animate-fade-in">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <img 
                                src={rev.avatarUrl} 
                                alt={rev.username} 
                                className="h-8 w-8 rounded-full object-cover border border-white/10 shadow-sm"
                              />
                              <div>
                                <span className="text-xs font-bold text-neutral-200 block">{rev.username}</span>
                                <span className="text-[10px] text-neutral-500 font-medium">
                                  {new Date(rev.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                              </div>
                            </div>
                            <div className="flex text-amber-400 bg-black/40 px-2.5 py-1 rounded-lg border border-white/5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`h-3 w-3 ${i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-700'}`} 
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-neutral-300 leading-relaxed pl-1">
                            {rev.comment}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
