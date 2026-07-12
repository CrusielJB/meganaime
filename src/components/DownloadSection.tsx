import React, { useState, useEffect } from "react";
import { Play, Trash2, HardDrive, Download, ChevronRight, AlertTriangle } from "lucide-react";
import { DownloadMetadata, getDownloadedEpisodesList, deleteEpisodeDownload, getStorageUsageMB } from "../utils/downloadDb";
import { getProxyImageUrl, getAnimePlaceholder, recoverCoverImageInHotPath } from "../utils/imageUtils";

interface DownloadSectionProps {
  onPlayEpisode: (episodeId: string, animeId: string) => void;
  onSelectAnimeById: (animeId: string) => void;
}

export function DownloadSection({ onPlayEpisode, onSelectAnimeById }: DownloadSectionProps) {
  const [downloads, setDownloads] = useState<DownloadMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageUsed, setStorageUsed] = useState(0);
  const [storageLimit, setStorageLimit] = useState(2000); // Default simulated limit in MB (2GB)

  useEffect(() => {
    loadDownloadsData();
  }, []);

  async function loadDownloadsData() {
    setLoading(true);
    try {
      const list = await getDownloadedEpisodesList();
      setDownloads(list);

      const usage = await getStorageUsageMB();
      setStorageUsed(usage);

      // Try estimating modern storage usage and limit in browser
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        if (estimate.quota) {
          const limitMB = Math.round(estimate.quota / (1024 * 1024));
          setStorageLimit(limitMB);
        }
      }
    } catch (e) {
      console.error("Failed to load downloads data:", e);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (e: React.MouseEvent, episodeId: string) => {
    e.stopPropagation();
    if (confirm("¿Estás seguro de que deseas eliminar este episodio de las descargas locales?")) {
      try {
        await deleteEpisodeDownload(episodeId);
        await loadDownloadsData();
      } catch (err) {
        console.error("Error deleting download:", err);
      }
    }
  };

  const handleClearAll = async () => {
    if (downloads.length === 0) return;
    if (confirm("¿Estás seguro de que deseas eliminar TODAS las descargas locales? Esta acción liberará espacio en el dispositivo.")) {
      try {
        for (const ep of downloads) {
          await deleteEpisodeDownload(ep.id);
        }
        await loadDownloadsData();
      } catch (err) {
        console.error("Error clearing all downloads:", err);
      }
    }
  };

  const storagePercentage = Math.min(100, Math.max(0.5, (storageUsed / storageLimit) * 100));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Header Info Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Mis Descargas</h1>
          <p className="text-neutral-400 text-xs md:text-sm mt-1 leading-relaxed">
            Episodios y películas guardadas localmente en este dispositivo para ver en cualquier lugar sin conexión a Internet.
          </p>
        </div>
        {downloads.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/20 text-xs font-bold text-neutral-300 hover:text-rose-400 transition cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            <span>Eliminar Todo</span>
          </button>
        )}
      </div>

      {/* Storage Estimate Progress Bar (Netflix style) */}
      <div className="bg-neutral-900/60 border border-white/5 p-4 sm:p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-500 flex-shrink-0">
            <HardDrive className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <div className="text-xs font-extrabold text-neutral-400 uppercase tracking-wider">
              Almacenamiento Local de megaAnime
            </div>
            <div className="text-lg font-black text-white mt-1">
              {storageUsed} MB <span className="text-neutral-400 font-semibold text-sm">usados de {storageLimit} MB estimables</span>
            </div>
          </div>
        </div>

        {/* Progress Bar Container */}
        <div className="flex-1 md:max-w-md w-full space-y-2">
          <div className="h-2 w-full rounded-full bg-neutral-800 overflow-hidden">
            <div 
              style={{ width: `${storagePercentage}%` }} 
              className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-500 transition-all duration-500"
            />
          </div>
          <div className="flex justify-between text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
            <span>Usado: {storagePercentage.toFixed(1)}%</span>
            <span>Espacio de la App</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <span className="h-10 w-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-neutral-500 font-bold uppercase tracking-widest animate-pulse">
            Escaneando almacenamiento local...
          </span>
        </div>
      ) : downloads.length === 0 ? (
        /* Empty State (Netflix / Crunchyroll Style) */
        <div className="text-center py-16 px-4 bg-neutral-900/20 border border-white/5 rounded-3xl max-w-xl mx-auto flex flex-col items-center justify-center space-y-6">
          <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center border border-white/10 text-neutral-500">
            <Download className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Sin descargas sin conexión</h2>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
              ¿Vas a viajar o tienes mala conexión? Descarga tus episodios favoritos y películas directamente desde el panel de detalles para verlos de forma instantánea.
            </p>
          </div>
          <button
            onClick={() => onSelectAnimeById("one-piece")} // Fallback or home redirect
            className="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl transition shadow-lg shadow-rose-500/20 hover:scale-[1.02] cursor-pointer"
          >
            Buscar Anime para Descargar
          </button>
        </div>
      ) : (
        /* Downloads Grid List */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {downloads.map((ep) => {
            return (
              <div
                key={ep.id}
                onClick={() => onPlayEpisode(ep.id, ep.animeId)}
                className="group flex gap-4 p-4 rounded-2xl bg-neutral-900/40 border border-white/5 hover:bg-white/5 hover:border-white/10 cursor-pointer transition-all duration-300"
              >
                {/* Cover Image aspect 16:9 like Netflix */}
                <div className="relative aspect-video w-32 sm:w-40 flex-shrink-0 overflow-hidden rounded-xl bg-neutral-800 border border-white/10 group-hover:border-rose-500/30 transition-colors">
                  <img
                    src={getProxyImageUrl(ep.coverUrl, ep.animeTitle)}
                    alt={ep.episodeTitle}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      recoverCoverImageInHotPath(e, ep.animeTitle, ep.animeId, "ANIME");
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                    <div className="h-9 w-9 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-all duration-300">
                      <Play className="h-4.5 w-4.5 fill-white text-white translate-x-0.5" />
                    </div>
                  </div>
                </div>

                {/* Details info */}
                <div className="flex-grow min-w-0 flex flex-col justify-between py-0.5">
                  <div className="min-w-0 space-y-1">
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAnimeById(ep.animeId);
                      }}
                      className="block text-xs font-bold text-neutral-400 hover:text-rose-400 transition truncate"
                    >
                      {ep.animeTitle}
                    </span>
                    <span className="block font-black text-sm text-neutral-100 group-hover:text-rose-400 transition truncate">
                      Capítulo {ep.episodeNumber}: {ep.episodeTitle}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                      <span className="px-1.5 py-0.5 rounded bg-white/5 text-neutral-300">
                        {ep.fileSizeMB} MB
                      </span>
                      <span>•</span>
                      <span>Local</span>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={(e) => handleDelete(e, ep.id)}
                      className="h-8 w-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/20 text-neutral-400 hover:text-rose-400 transition cursor-pointer"
                      title="Eliminar descarga"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
