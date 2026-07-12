import React, { useState, useEffect, useRef } from "react";
import { 
  X, 
  Server, 
  ArrowLeft, 
  ArrowRight, 
  Info,
  Menu
} from "lucide-react";
import { Episode, User } from "../types";
import Hls from "hls.js";
import { saveEpisodeProgress, getLocalEpisodeProgress, normalizeAnimeId } from "../utils/progress";
import { getProxyImageUrl, getAnimePlaceholder, recoverCoverImageInHotPath } from "../utils/imageUtils";
import { getAnimesWithEpisodes } from "../utils/animeDb";
import { getDownloadedEpisodeBlob } from "../utils/downloadDb";

function isEmbedUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (
    lower.includes("embed") ||
    lower.includes("iframe") ||
    lower.includes("player") ||
    lower.includes("mega.nz") ||
    lower.includes("ok.ru") ||
    lower.includes("fembed") ||
    lower.includes("streamtape") ||
    lower.includes("mixdrop") ||
    lower.includes("rapidcloud") ||
    lower.includes("megacloud") ||
    lower.includes("rapid-cloud") ||
    lower.includes("youtube.com/embed") ||
    lower.includes("dailymotion.com/embed") ||
    lower.includes("vimeo.com/video") ||
    lower.includes("monoschinos") ||
    lower.includes("animeflv")
  ) {
    return true;
  }
  const cleanUrl = url.split("?")[0].split("#")[0].toLowerCase();
  if (cleanUrl.endsWith(".mp4") || cleanUrl.endsWith(".m3u8") || cleanUrl.endsWith(".webm") || cleanUrl.endsWith(".ogg")) {
    return false;
  }
  return true;
}

function injectStartTimeIntoEmbedUrl(url: string, seconds: number): string {
  if (!url || seconds <= 0) return url;
  
  const lower = url.toLowerCase();
  
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}start=${Math.floor(seconds)}`;
  }
  
  if (lower.includes("vimeo.com")) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}t=${Math.floor(seconds)}s`;
  }
  
  if (lower.includes("ok.ru")) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}start=${Math.floor(seconds)}`;
  }
  
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}start=${Math.floor(seconds)}&t=${Math.floor(seconds)}`;
}

interface VideoPlayerProps {
  animeId: string;
  episodeId: string;
  contentType?: "anime" | "movie";
  animeTitle: string;
  animeCoverUrl: string;
  genres?: string[];
  onClose: () => void;
  onNavigateEpisode: (direction: "prev" | "next") => void;
  hasPrev: boolean;
  hasNext: boolean;
  currentUser?: User | null;
  onProgressSave?: (animeId: string, episodeId: string, episodeNumber: number, progressSeconds: number, durationSeconds: number) => void;
}

export default function VideoPlayer({
  animeId,
  episodeId,
  contentType = "anime",
  animeTitle,
  animeCoverUrl,
  genres = [],
  onClose,
  onNavigateEpisode,
  hasPrev,
  hasNext,
  currentUser = null,
  onProgressSave
}: VideoPlayerProps) {
  const [episodeData, setEpisodeData] = useState<Partial<Episode> | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeServerIdx, setActiveServerIdx] = useState(0);
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
  
  // Immersive Sidebar Control (Colapsed by default like Crunchyroll/Netflix theater mode)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [postMessageActive, setPostMessageActive] = useState(true);

  // Resolve premium/canonical metadata from local catalog using normalized ID
  const { resolvedTitle, resolvedCover } = React.useMemo(() => {
    const normId = normalizeAnimeId(animeId, animeTitle);
    try {
      const match = getAnimesWithEpisodes().find(a => a.id === normId);
      if (match) {
        return {
          resolvedTitle: match.title,
          resolvedCover: match.coverUrl
        };
      }
    } catch (e) {}
    return {
      resolvedTitle: animeTitle || normId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      resolvedCover: animeCoverUrl || ""
    };
  }, [animeId, animeTitle, animeCoverUrl]);

  // Custom external video servers added by the user
  const [externalUrlInput, setExternalUrlInput] = useState("");
  const [customServers, setCustomServers] = useState<Array<{ name: string; url: string }>>([]);
  const [customUrlError, setCustomUrlError] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const episodeNumber = React.useMemo(() => {
    if (episodeData?.number !== undefined) return episodeData.number;
    const parts = episodeId.split("-");
    const lastPart = parts[parts.length - 1];
    if (!isNaN(Number(lastPart))) return Number(lastPart);
    return 1;
  }, [episodeData, episodeId]);

  const displayTitle = React.useMemo(() => {
    let rawTitle = episodeData?.title || "";
    if (!rawTitle) {
      const parts = episodeId.split("-");
      const lastPart = parts[parts.length - 1];
      if (!isNaN(Number(lastPart))) {
        return `Capítulo ${lastPart}`;
      } else if (episodeId.includes("-ep-")) {
        return `Capítulo ${episodeId.split("-ep-")[1]}`;
      } else {
        let humanized = episodeId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        if (animeTitle && humanized.toLowerCase().includes(animeTitle.toLowerCase())) {
          const regex = new RegExp(animeTitle, "gi");
          humanized = humanized.replace(regex, "").trim();
        }
        return humanized || `Capítulo ${episodeId}`;
      }
    }
    if (/^\d+$/.test(rawTitle.trim())) {
      return `Capítulo ${rawTitle.trim()}`;
    }
    const lower = rawTitle.toLowerCase();
    if (lower.includes("capítulo") || lower.includes("capitulo") || lower.includes("episodio") || lower.includes("ep ")) {
      return rawTitle;
    }
    return rawTitle;
  }, [episodeData, episodeId, animeTitle]);

  // Check and load offline downloaded video from IndexedDB
  useEffect(() => {
    let blobUrl: string | null = null;
    async function checkLocalBlob() {
      try {
        const blob = await getDownloadedEpisodeBlob(episodeId);
        if (blob) {
          blobUrl = URL.createObjectURL(blob);
          setLocalVideoUrl(blobUrl);
          setActiveServerIdx(0);
        } else {
          setLocalVideoUrl(null);
        }
      } catch (err) {
        console.warn("Could not retrieve offline video download blob:", err);
        setLocalVideoUrl(null);
      }
    }
    checkLocalBlob();

    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [episodeId]);

  // Load episode details
  useEffect(() => {
    async function fetchEpisodeDetails() {
      setLoading(true);
      try {
        const res = await fetch(`/api/episode/${encodeURIComponent(episodeId)}`);
        const data = await res.json();
        setEpisodeData(data);
      } catch (err) {
        console.error("Error loading episode players:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchEpisodeDetails();
    
    setCustomServers([]);
    setActiveServerIdx(0);
    setExternalUrlInput("");
    setCustomUrlError("");
  }, [episodeId]);

  const servers = [
    ...(localVideoUrl ? [{ name: "Reproducción Local (Descargado)", url: localVideoUrl }] : []),
    ...(episodeData?.videoServers && episodeData.videoServers.length > 0
      ? episodeData.videoServers
      : [
          { name: "MegaServer Directo", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" },
          { name: "MegaServer Respaldo", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" }
        ]),
    ...customServers
  ];
  const activeServer = servers[activeServerIdx] || servers[0];

  const embedUrlWithTime = React.useMemo(() => {
    if (!activeServer || !isEmbedUrl(activeServer.url)) return "";
    
    const saved = getLocalEpisodeProgress(animeId, currentUser, resolvedTitle);
    if (saved && saved.episodeId === episodeId && saved.progressSeconds > 5) {
      const duration = saved.durationSeconds || 1440;
      if (saved.progressSeconds < duration * 0.90) {
        return injectStartTimeIntoEmbedUrl(activeServer.url, saved.progressSeconds);
      }
    }
    return activeServer.url;
  }, [activeServer, episodeId, animeId, currentUser, resolvedTitle]);

  // Direct video load & Hls support
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeServer || isEmbedUrl(activeServer.url)) return;

    let hls: Hls | null = null;
    const isHls = activeServer.url.toLowerCase().split("?")[0].split("#")[0].endsWith(".m3u8");

    if (isHls) {
      if (Hls.isSupported()) {
        hls = new Hls({
          maxMaxBufferLength: 10,
          enableWorker: true
        });
        hls.loadSource(activeServer.url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(e => console.log("Autoplay blocked:", e));
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = activeServer.url;
        video.load();
        video.play().catch(e => console.log("Autoplay blocked:", e));
      }
    } else {
      video.src = activeServer.url;
      video.load();
      video.play().catch(e => console.log("Autoplay blocked:", e));
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [activeServer, activeServerIdx, loading]);

  // Direct video seek progress on loaded
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeServer || isEmbedUrl(activeServer.url)) return;

    const handleLoadedMetadata = () => {
      const saved = getLocalEpisodeProgress(animeId, currentUser, resolvedTitle);
      if (saved && saved.episodeId === episodeId && saved.progressSeconds > 0) {
        if (saved.progressSeconds < video.duration * 0.95) {
          video.currentTime = saved.progressSeconds;
        }
      }
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    return () => video.removeEventListener("loadedmetadata", handleLoadedMetadata);
  }, [activeServer, activeServerIdx, episodeId, animeId, currentUser]);

  // Native HTML5 Video real-time event listeners (timeupdate, pause, seeked)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeServer || isEmbedUrl(activeServer.url)) return;

    const handleVideoProgress = () => {
      if (video.currentTime > 0 && video.duration > 0) {
        saveEpisodeProgress(
          animeId,
          episodeId,
          episodeNumber,
          video.currentTime,
          video.duration,
          currentUser,
          false,
          "anime",
          resolvedTitle,
          resolvedCover
        );
      }
    };

    const handleForceSave = () => {
      if (video.currentTime > 0 && video.duration > 0) {
        saveEpisodeProgress(
          animeId,
          episodeId,
          episodeNumber,
          video.currentTime,
          video.duration,
          currentUser,
          true,
          "anime",
          resolvedTitle,
          resolvedCover
        );
      }
    };

    video.addEventListener("timeupdate", handleVideoProgress);
    video.addEventListener("pause", handleForceSave);
    video.addEventListener("seeked", handleVideoProgress);

    return () => {
      if (video.currentTime > 0 && video.duration > 0) {
        saveEpisodeProgress(
          animeId,
          episodeId,
          episodeNumber,
          video.currentTime,
          video.duration,
          currentUser,
          true,
          "anime",
          resolvedTitle,
          resolvedCover
        );
      }
      video.removeEventListener("timeupdate", handleVideoProgress);
      video.removeEventListener("pause", handleForceSave);
      video.removeEventListener("seeked", handleVideoProgress);
    };
  }, [activeServer, activeServerIdx, episodeId, animeId, currentUser]);

  // Simulated timer and postMessage API for iframe embeds
  useEffect(() => {
    if (!activeServer || !isEmbedUrl(activeServer.url)) return;

    const isMovie = genres.includes("Película") || episodeId.toLowerCase().includes("movie") || episodeId.toLowerCase().includes("pelicula");
    const estimatedDuration = isMovie ? 7200 : 1440;
    
    let trackedTime = 1;
    
    const saved = getLocalEpisodeProgress(animeId, currentUser, resolvedTitle);
    if (saved && saved.episodeId === episodeId) {
      trackedTime = Math.max(1, saved.progressSeconds);
    }

    let messageCount = 0;
    
    const checkTimeout = setTimeout(() => {
      if (messageCount === 0) {
        setPostMessageActive(false);
      }
    }, 8000);

    const saveCurrentProgress = (force = false) => {
      if (onProgressSave) {
        onProgressSave(animeId, episodeId, episodeNumber, trackedTime, estimatedDuration);
      } else {
        saveEpisodeProgress(
          animeId,
          episodeId,
          episodeNumber,
          trackedTime,
          estimatedDuration,
          currentUser,
          force,
          contentType,
          resolvedTitle,
          resolvedCover
        );
      }
    };

    if (trackedTime > 30) {
      saveCurrentProgress(true);
    } else {
      const initTimer = setTimeout(() => {
        if (trackedTime > 1) saveCurrentProgress(false);
      }, 15000);
      (saveCurrentProgress as any).__initTimer = initTimer;
    }

    const handleIframeMessage = (event: MessageEvent) => {
      let data: any = null;
      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch (e) {
        if (typeof event.data === "string") {
          const str = event.data.trim();
          if (str.startsWith("time:") || str.startsWith("progress:")) {
            const val = parseFloat(str.split(":")[1]);
            if (!isNaN(val) && val > 0) {
              messageCount++;
              setPostMessageActive(true);
              trackedTime = val;
              saveCurrentProgress(false);
            }
          }
        }
        return;
      }

      if (!data) return;

      let progress: number | null = null;
      let duration: number | null = null;

      if (data.event === "infoDelivery" && data.info) {
        if (data.info.currentTime !== undefined) progress = data.info.currentTime;
        if (data.info.duration !== undefined) duration = data.info.duration;
      }
      if (data.event === "timeupdate" && data.data) {
        if (data.data.seconds !== undefined) progress = data.data.seconds;
        if (data.data.duration !== undefined) duration = data.data.duration;
      }

      if (data.event === "time" || data.event === "timeupdate" || data.event === "progress") {
        if (data.value !== undefined && typeof data.value === "number") progress = data.value;
        else if (data.time !== undefined && typeof data.time === "number") progress = data.time;
        if (data.duration !== undefined && typeof data.duration === "number") duration = data.duration;
      }

      if (data.type === "timeupdate" || data.event === "timeupdate") {
        if (data.currentTime !== undefined && typeof data.currentTime === "number") progress = data.currentTime;
        if (data.duration !== undefined && typeof data.duration === "number") duration = data.duration;
      }

      if (progress === null) {
        const progressKeys = ["currentTime", "progress", "seconds", "time", "current_time", "value"];
        for (const key of progressKeys) {
          if (data[key] !== undefined && typeof data[key] === "number") {
            progress = data[key];
            break;
          }
        }
      }
      if (duration === null) {
        const durationKeys = ["duration", "totalTime", "length", "total_time"];
        for (const key of durationKeys) {
          if (data[key] !== undefined && typeof data[key] === "number") {
            duration = data[key];
            break;
          }
        }
      }

      if (progress !== null && progress > 0) {
        messageCount++;
        setPostMessageActive(true);
        trackedTime = progress;
        const finalDuration = duration && duration > 0 ? duration : estimatedDuration;
        
        if (onProgressSave) {
          onProgressSave(animeId, episodeId, episodeNumber, progress, finalDuration);
        } else {
          saveEpisodeProgress(
            animeId,
            episodeId,
            episodeNumber,
            progress,
            finalDuration,
            currentUser,
            false,
            contentType,
            resolvedTitle,
            resolvedCover
          );
        }
      }
    };

    const interval = setInterval(() => {
      trackedTime = Math.min(estimatedDuration, trackedTime + 10);
      saveCurrentProgress(false);
    }, 10000);

    const handleBeforeUnload = () => {
      saveCurrentProgress(true);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("message", handleIframeMessage);

    return () => {
      clearTimeout(checkTimeout);
      if ((saveCurrentProgress as any).__initTimer) {
        clearTimeout((saveCurrentProgress as any).__initTimer);
      }
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("message", handleIframeMessage);
      saveCurrentProgress(true);
    };
  }, [activeServer, activeServerIdx, episodeId, animeId, currentUser, resolvedTitle, resolvedCover]);

  // Add custom URL
  const handleAddCustomUrl = () => {
    setCustomUrlError("");
    const input = externalUrlInput.trim();
    if (!input) {
      setCustomUrlError("Por favor ingresa un enlace o iframe válido.");
      return;
    }

    let targetUrl = input;
    if (input.toLowerCase().includes("<iframe")) {
      const srcMatch = input.match(/src=["']([^"']+)["']/i);
      if (srcMatch && srcMatch[1]) {
        targetUrl = srcMatch[1];
      } else {
        setCustomUrlError("No se pudo extraer la dirección src del iframe.");
        return;
      }
    }

    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://") && !targetUrl.startsWith("//")) {
      setCustomUrlError("La dirección debe comenzar con http:// o https:// o //");
      return;
    }

    if (targetUrl.startsWith("//")) {
      targetUrl = `https:${targetUrl}`;
    }

    const newServer = {
      name: `🌐 Servidor Externo #${customServers.length + 1}`,
      url: targetUrl
    };

    const newCustomServers = [...customServers, newServer];
    setCustomServers(newCustomServers);
    setActiveServerIdx(servers.length - 1 + newCustomServers.length);
    setExternalUrlInput("");
  };

  const isEmbed = activeServer ? isEmbedUrl(activeServer.url) : false;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950 text-neutral-100 animate-fade-in">
      {/* Top Controls Bar */}
      <div className="flex h-16 items-center justify-between border-b border-white/5 bg-black/95 px-4 sm:px-6 z-10 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
            title="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <img 
            src={getProxyImageUrl(resolvedCover, resolvedTitle)} 
            alt={resolvedTitle} 
            className="h-10 w-8 object-cover rounded shadow border border-white/10"
            onError={(e) => {
              recoverCoverImageInHotPath(e, resolvedTitle, animeId, "ANIME");
            }}
          />
          <div>
            <span className="text-xs text-rose-500 font-bold uppercase tracking-widest">{resolvedTitle}</span>
            <h1 className="text-sm font-bold text-neutral-100 line-clamp-1">{displayTitle}</h1>
          </div>
        </div>

        {/* Action controls (Immersive Toggle / Close) */}
        <div className="flex items-center space-x-2">
          {/* Immersive Servers & Info Toggle Button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`flex h-10 px-4 items-center justify-center gap-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
              isSidebarOpen
                ? "bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/25"
                : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white"
            }`}
            title="Ver servidores y episodios"
          >
            <Menu className="h-4 w-4" />
            <span>Servidores e Info</span>
          </button>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-neutral-400 hover:text-white hover:bg-rose-500/10 hover:text-rose-400 transition cursor-pointer"
            title="Cerrar reproductor"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Theatre Frame split in Video vs Sidebar info */}
      <div className="flex-grow flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Side: Huge Cinema Player viewport (Takes 100% when sidebar is closed) */}
        <div className="flex-grow flex-1 min-h-[45vh] lg:min-h-0 lg:h-full bg-black relative flex items-center justify-center overflow-hidden p-0 sm:p-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-4 text-center p-6">
              <div className="h-12 w-12 rounded-full border-2 border-t-2 border-neutral-800 border-t-rose-500 animate-spin" />
              <span className="text-xs text-neutral-400 animate-pulse">Invocando reproductor premium...</span>
            </div>
          ) : activeServer ? (
            <div className="w-full h-full flex items-center justify-center bg-black relative">
              {isEmbed ? (
                <div className="w-full h-full relative overflow-hidden shadow-2xl">
                  <iframe
                    key={embedUrlWithTime}
                    src={embedUrlWithTime}
                    className="w-full h-full border-0"
                    allowFullScreen
                    allow="autoplay; encrypted-media; picture-in-picture"
                    referrerPolicy="no-referrer"
                    title={activeServer.name}
                  />
                  {!postMessageActive && (
                    <div className="absolute top-4 left-4 right-4 bg-rose-500/90 text-white backdrop-blur px-4 py-2.5 rounded-xl border border-rose-400/20 text-xs flex items-center justify-between shadow-2xl animate-slide-in max-w-xl mx-auto z-20">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 flex-shrink-0" />
                        <span>Este reproductor no comparte eventos de progreso. Guardaremos tu avance automáticamente cada 10 segundos.</span>
                      </div>
                      <button 
                        onClick={() => setPostMessageActive(true)} 
                        className="ml-3 hover:text-white/80 font-bold cursor-pointer"
                      >
                        Entendido
                      </button>
                    </div>
                  )}
                  <div className="absolute bottom-4 right-4 bg-black/85 backdrop-blur px-3 py-2 rounded-xl border border-white/10 text-[9px] text-neutral-400 flex items-center gap-1.5 pointer-events-none z-10">
                    <Info className="h-3.5 w-3.5 text-rose-500" />
                    <span>Usa la pantalla completa del reproductor para omitir anuncios.</span>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
                  <video
                    ref={videoRef}
                    src={activeServer.url}
                    className="w-full h-full max-h-full object-contain cursor-pointer"
                    controls
                    autoPlay
                    playsInline
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center p-6">
              <span className="text-sm text-neutral-500">No se pudieron recuperar los reproductores de video. Intenta seleccionar otro servidor.</span>
            </div>
          )}
        </div>

        {/* Right Side: Options & Episode Switching (Theatre Sidebar - Rendered Conditionally) */}
        {isSidebarOpen && (
          <div className="w-full lg:w-85 bg-neutral-900/95 border-t lg:border-t-0 lg:border-l border-white/5 p-5 flex-shrink-0 flex flex-col justify-between overflow-y-auto z-20 shadow-2xl animate-fade-in">
            <div className="space-y-4">
              {/* Episode Poster and Info Card */}
              <div className="p-4 rounded-2xl border border-white/5 bg-black/40 space-y-3">
                <div className="flex gap-3">
                  <img
                    src={getProxyImageUrl(resolvedCover, resolvedTitle)}
                    alt={resolvedTitle}
                    className="h-20 w-14 object-cover rounded-lg shadow-lg border border-white/5"
                    onError={(e) => {
                      recoverCoverImageInHotPath(e, resolvedTitle, animeId, "ANIME");
                    }}
                  />
                  <div className="flex-grow min-w-0">
                    <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">{resolvedTitle}</span>
                    <h3 className="text-xs font-bold text-white line-clamp-2 mt-0.5">{displayTitle}</h3>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {genres.slice(0, 2).map((g, i) => (
                        <span key={i} className="text-[9px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded-full font-semibold">
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="border-t border-white/5 pt-2">
                  <p className="text-[11px] text-neutral-400 leading-relaxed line-clamp-4 hover:line-clamp-none transition-all duration-300 cursor-pointer" title="Haga clic para expandir">
                    {episodeData?.synopsis || episodeData?.description || 
                      `Disfruta de este capítulo en megaAnime. En caso de fallas de carga, puedes cambiar el reproductor o servidor en la sección de abajo.`
                    }
                  </p>
                </div>
              </div>

              {/* Server Selector List */}
              <div className="p-4 rounded-2xl border border-white/5 bg-black/40 space-y-3">
                <div className="flex items-center space-x-2 border-b border-white/5 pb-2">
                  <Server className="h-4 w-4 text-rose-500" />
                  <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest font-mono">Seleccionar Reproductor</span>
                </div>
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                  {servers.map((srv, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setActiveServerIdx(idx);
                      }}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        activeServerIdx === idx
                          ? "bg-rose-500/10 border-rose-500/40 text-rose-400"
                          : "bg-neutral-900 border-white/5 text-neutral-400 hover:border-neutral-700 hover:text-white"
                      }`}
                    >
                      <span className="truncate">{srv.name}</span>
                      {activeServerIdx === idx && <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add Custom Streaming Source */}
              <div className="p-4 rounded-2xl border border-white/5 bg-black/40 space-y-3">
                <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest font-mono">Añadir Servidor Externo</span>
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    placeholder="Enlace de video o código iframe..."
                    value={externalUrlInput}
                    onChange={(e) => setExternalUrlInput(e.target.value)}
                    className="w-full bg-neutral-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-rose-500 outline-none"
                  />
                  {customUrlError && <p className="text-[10px] text-rose-500 font-semibold">{customUrlError}</p>}
                  <button
                    onClick={handleAddCustomUrl}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded-xl transition cursor-pointer"
                  >
                    Agregar y Reproducir
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Episode Navigation */}
            <div className="flex space-x-2 mt-6 lg:mt-0 pt-4 border-t border-white/5">
              <button
                onClick={() => onNavigateEpisode("prev")}
                disabled={!hasPrev}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  hasPrev
                    ? "bg-black/40 border-white/5 text-neutral-300 hover:bg-white/5 hover:text-white"
                    : "opacity-40 cursor-not-allowed border-transparent text-neutral-600"
                }`}
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Anterior</span>
              </button>

              <button
                onClick={() => onNavigateEpisode("next")}
                disabled={!hasNext}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  hasNext
                    ? "bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-600/15 hover:bg-rose-500"
                    : "opacity-40 cursor-not-allowed border-transparent text-neutral-600"
                }`}
              >
                <span>Siguiente</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
