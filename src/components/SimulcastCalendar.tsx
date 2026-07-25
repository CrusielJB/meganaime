import React, { useState } from "react";
import { Calendar, Clock, Play, Sparkles, ChevronRight, Star, Filter } from "lucide-react";
import { Anime } from "../types";
import { getAnimePlaceholder, getProxyImageUrl } from "../utils/imageUtils";

interface SimulcastCalendarProps {
  animes: Anime[];
  onSelectAnime: (anime: Anime) => void;
  onPlayEpisode?: (animeId: string, episodeId: string) => void;
}

const DAYS_OF_WEEK = [
  { id: "lunes", label: "Lunes", short: "Lun" },
  { id: "martes", label: "Martes", short: "Mar" },
  { id: "miercoles", label: "Miércoles", short: "Mié" },
  { id: "jueves", label: "Jueves", short: "Jue" },
  { id: "viernes", label: "Viernes", short: "Vie" },
  { id: "sabado", label: "Sábado", short: "Sáb" },
  { id: "domingo", label: "Domingo", short: "Dom" }
];

export const SimulcastCalendar: React.FC<SimulcastCalendarProps> = ({
  animes,
  onSelectAnime,
  onPlayEpisode
}) => {
  // Determine current day of week in Spanish
  const todayIndex = (new Date().getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(todayIndex);

  const selectedDay = DAYS_OF_WEEK[selectedDayIndex];

  // Filter airing animes and assign deterministic release day based on title hash
  const airingAnimes = animes.filter(a => a.status === "En emisión" || a.type === "Anime");

  const getAnimeDayIndex = (anime: Anime): number => {
    let hash = 0;
    for (let i = 0; i < anime.title.length; i++) {
      hash = anime.title.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % 7;
  };

  const getAnimeAirTime = (anime: Anime): string => {
    let hash = 0;
    for (let i = 0; i < anime.id.length; i++) {
      hash = anime.id.charCodeAt(i) + ((hash << 3) - hash);
    }
    const hour = 12 + (Math.abs(hash) % 11); // 12:00 to 22:00
    const minutes = (Math.abs(hash * 7) % 4) * 15; // 00, 15, 30, 45
    return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} hrs`;
  };

  const dayAnimes = airingAnimes.filter(a => getAnimeDayIndex(a) === selectedDayIndex);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-rose-950/40 via-neutral-900 to-purple-950/40 p-6 md:p-10 backdrop-blur-xl shadow-2xl">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-rose-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-3.5 py-1 text-xs font-bold text-rose-400 border border-rose-500/20">
              <Sparkles className="h-3.5 w-3.5" />
              Simulcast Temporada Primavera 2026
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              Calendario de Estrenos
            </h1>
            <p className="text-sm md:text-base text-neutral-300">
              Sigue las fechas y horas exactas de emisión de tus animes favoritos en transmisión simultánea directa desde Japón.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
            <Calendar className="h-8 w-8 text-rose-500 shrink-0" />
            <div>
              <span className="text-xs text-neutral-400 font-medium block">Día de Hoy</span>
              <span className="text-sm font-bold text-white uppercase tracking-wide">
                {DAYS_OF_WEEK[todayIndex].label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Days Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-white/5">
        {DAYS_OF_WEEK.map((day, idx) => {
          const isToday = idx === todayIndex;
          const isSelected = idx === selectedDayIndex;
          const count = airingAnimes.filter(a => getAnimeDayIndex(a) === idx).length;

          return (
            <button
              key={day.id}
              onClick={() => setSelectedDayIndex(idx)}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border shrink-0 ${
                isSelected
                  ? "bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/30 scale-[1.02]"
                  : "bg-neutral-900/60 text-neutral-400 border-white/5 hover:bg-neutral-800 hover:text-white"
              }`}
            >
              <span>{day.label}</span>
              {isToday && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold uppercase ${isSelected ? "bg-white text-rose-600" : "bg-rose-500/20 text-rose-400"}`}>
                  Hoy
                </span>
              )}
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isSelected ? "bg-black/30 text-white" : "bg-neutral-800 text-neutral-400"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Section Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-7 w-1 bg-rose-500 rounded-full" />
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Estrenos del {selectedDay.label}</span>
            <span className="text-xs text-neutral-400 font-normal">({dayAnimes.length} animes)</span>
          </h2>
        </div>
      </div>

      {/* Animes Grid for Selected Day */}
      {dayAnimes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {dayAnimes.map((anime) => {
            const airTime = getAnimeAirTime(anime);
            const currentEpNum = anime.airedEpisodesCount || anime.episodesCount || 12;
            const episodeId = `${anime.id}-ep-${currentEpNum}`;

            return (
              <div
                key={anime.id}
                onClick={() => onSelectAnime(anime)}
                className="group relative bg-neutral-900/50 border border-white/5 hover:border-rose-500/40 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-rose-950/20 cursor-pointer flex flex-col"
              >
                {/* Banner/Cover Image */}
                <div className="relative h-48 w-full overflow-hidden bg-neutral-950">
                  <img
                    src={getProxyImageUrl(anime.bannerUrl || anime.coverUrl, anime.title, true)}
                    alt={anime.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getAnimePlaceholder(anime.title, true);
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/40 to-transparent" />

                  {/* Air Time Badge */}
                  <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md border border-white/10 text-white px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg">
                    <Clock className="h-3.5 w-3.5 text-rose-500" />
                    <span>{airTime}</span>
                  </div>

                  {/* Rating Badge */}
                  <div className="absolute top-3 right-3 bg-rose-500/90 text-white px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1">
                    <Star className="h-3 w-3 fill-white text-white" />
                    <span>{anime.rating.toFixed(1)}</span>
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-white line-clamp-1 group-hover:text-rose-400 transition-colors">
                      {anime.title}
                    </h3>
                    <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                      {anime.synopsis || "Sinopsis no disponible."}
                    </p>
                  </div>

                  {/* Genres Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {anime.genres.slice(0, 3).map((g) => (
                      <span key={g} className="text-[10px] bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded-md font-medium">
                        {g}
                      </span>
                    ))}
                  </div>

                  {/* Bottom Action Bar */}
                  <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-rose-400">
                      Episodio {currentEpNum} en emisión
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onPlayEpisode) {
                          onPlayEpisode(anime.id, episodeId);
                        } else {
                          onSelectAnime(anime);
                        }
                      }}
                      className="bg-rose-600 hover:bg-rose-500 text-white font-bold p-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1 shadow-md shadow-rose-600/20"
                      title="Reproducir último capítulo"
                    >
                      <Play className="h-3.5 w-3.5 fill-white text-white" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-neutral-900/30 border border-white/5 rounded-3xl p-12 text-center space-y-4">
          <Calendar className="h-12 w-12 text-neutral-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Sin estrenos programados para este día</h3>
            <p className="text-xs text-neutral-400">Selecciona otro día de la semana para explorar los lanzamientos simulcast.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimulcastCalendar;
