import React from "react";
import { Star, Heart, Play } from "lucide-react";
import { Anime } from "../types";
import { getAnimePlaceholder, getProxyImageUrl, recoverCoverImageInHotPath } from "../utils/imageUtils";

interface AnimeCardProps {
  key?: React.Key;
  anime: Anime;
  onSelect: (anime: Anime) => void;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent, animeId: string) => void;
}

export default function AnimeCard({
  anime,
  onSelect,
  isFavorite,
  onToggleFavorite
}: AnimeCardProps) {
  return (
    <div
      onClick={() => onSelect(anime)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          onSelect(anime);
        }
      }}
      tabIndex={0}
      className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/5 bg-neutral-900 transition-all duration-300 hover:-translate-y-1 hover:border-rose-500/30 hover:shadow-xl hover:shadow-rose-950/20 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500/50 focus:-translate-y-1 focus:scale-[1.02] focus:shadow-xl focus:shadow-rose-950/30"
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden">
        <img
          src={getProxyImageUrl(anime.coverUrl, anime.title)}
          alt={anime.title}
          className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          referrerPolicy="no-referrer"
          onError={(e) => {
            recoverCoverImageInHotPath(e, anime.title, anime.id);
          }}
        />
        
        {/* Shadow Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/10 to-transparent opacity-60 group-hover:opacity-85 transition-opacity" />

        {/* Hover Hover Actions (Fades in) */}
        <div className="absolute inset-0 flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg self-center mb-3 scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play className="h-5 w-5 fill-white ml-0.5" />
          </div>
          <p className="text-[11px] text-neutral-300 line-clamp-3 text-center mb-1 leading-snug">
            {anime.synopsis}
          </p>
        </div>

        {/* Top Badges */}
        <div className="absolute top-2 left-2 right-2 flex justify-between items-start z-10 pointer-events-none">
          <span className="rounded bg-black/60 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-bold text-amber-400 border border-white/5 flex items-center">
            <Star className="h-3 w-3 mr-0.5 fill-amber-400 text-amber-400" />
            {(anime.rating || 0).toFixed(1)}
          </span>
          <span className="rounded bg-black/60 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-bold text-neutral-300 border border-white/5">
            {anime.year}
          </span>
        </div>

        {/* Heart Icon Button (Manual click handler, stops propagation) */}
        <button
          onClick={(e) => onToggleFavorite(e, anime.id)}
          className={`absolute bottom-2 right-2 p-1.5 rounded-lg border backdrop-blur-md transition z-20 ${
            isFavorite
              ? "bg-rose-500/20 border-rose-500/40 text-rose-500"
              : "bg-black/40 border-white/5 text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10"
          }`}
          title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
        >
          <Heart className={`h-4.5 w-4.5 ${isFavorite ? "fill-rose-500" : ""}`} />
        </button>
      </div>

      {/* Info Body */}
      <div className="p-3">
        <h3 className="font-semibold text-sm text-neutral-100 group-hover:text-rose-400 transition-colors line-clamp-1">
          {anime.title}
        </h3>
        <div className="flex items-center justify-between mt-1 text-[11px] text-neutral-400">
          <span>{anime.type}</span>
          <span className={`font-semibold ${anime.status === "En emisión" ? "text-emerald-500" : "text-neutral-500"}`}>
            {anime.status}
          </span>
        </div>
      </div>
    </div>
  );
}
