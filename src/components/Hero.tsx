import React, { useState, useEffect } from "react";
import { Play, Plus, Check, Star, Info, ChevronRight, ChevronLeft } from "lucide-react";
import { Anime } from "../types";
import { getAnimePlaceholder, getProxyImageUrl, recoverCoverImageInHotPath } from "../utils/imageUtils";

interface HeroProps {
  featuredAnimes: Anime[];
  onSelectAnime: (anime: Anime) => void;
  favorites: string[];
  onToggleFavorite: (animeId: string) => void;
}

export default function Hero({
  featuredAnimes,
  onSelectAnime,
  favorites,
  onToggleFavorite
}: HeroProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [playVideo, setPlayVideo] = useState(false);

  useEffect(() => {
    if (featuredAnimes.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % featuredAnimes.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [featuredAnimes]);

  useEffect(() => {
    setPlayVideo(false);
    const videoTimer = setTimeout(() => {
      setPlayVideo(true);
    }, 3500);

    return () => clearTimeout(videoTimer);
  }, [activeIndex]);

  if (!featuredAnimes || featuredAnimes.length === 0) {
    return (
      <div className="h-[450px] w-full animate-pulse rounded-2xl bg-neutral-900" />
    );
  }

  const active = featuredAnimes[activeIndex];
  const isFavorite = favorites.includes(active.id);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev - 1 + featuredAnimes.length) % featuredAnimes.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev + 1) % featuredAnimes.length);
  };

  return (
    <div className="relative h-[480px] w-full overflow-hidden rounded-2xl border border-white/5 bg-neutral-950 shadow-2xl">
      {/* Background Image with Dark Overlays */}
      <div className="absolute inset-0 transition-all duration-1000 ease-out">
        {playVideo ? (
          <video
            src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-cover object-center filter brightness-[0.6] transition-opacity duration-1000 animate-fade-in"
          />
        ) : (
          <img
            src={getProxyImageUrl(active.bannerUrl, active.title, true)}
            alt={active.title}
            className="h-full w-full object-cover object-center scale-105 filter brightness-75 transition-all duration-1000"
            referrerPolicy="no-referrer"
            onError={(e) => {
              recoverCoverImageInHotPath(e, active.title, active.id);
            }}
          />
        )}
        {/* Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent" />
      </div>

      {/* Hero Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 md:p-12 max-w-2xl z-10">
        {/* Category badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="inline-flex items-center rounded-md bg-rose-500 px-2 py-0.5 text-xs font-bold text-white uppercase tracking-wider">
            {active.status}
          </span>
          <span className="inline-flex items-center rounded-md bg-black/40 backdrop-blur-md border border-white/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
            <Star className="mr-1 h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {active.rating}
          </span>
          <span className="inline-flex items-center rounded-md bg-black/40 backdrop-blur-md border border-white/10 px-2.5 py-0.5 text-xs font-semibold text-neutral-300">
            {active.year}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white mb-3 leading-tight drop-shadow-md">
          {active.title}
        </h1>

        {/* Synopsis */}
        <p className="text-sm text-neutral-300 mb-6 line-clamp-3 md:line-clamp-4 leading-relaxed drop-shadow-sm max-w-xl">
          {active.synopsis}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onSelectAnime(active)}
            className="flex items-center space-x-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-black shadow-lg shadow-white/10 hover:bg-neutral-100 active:scale-95 transition"
          >
            <Play className="h-4.5 w-4.5 fill-black text-black" />
            <span>Ver Capítulos</span>
          </button>

          <button
            onClick={() => onToggleFavorite(active.id)}
            className={`flex items-center space-x-2 rounded-xl px-5 py-3 text-sm font-semibold border transition ${
              isFavorite
                ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                : "bg-black/30 backdrop-blur-md border-white/10 text-white hover:bg-white/10"
            }`}
          >
            {isFavorite ? (
              <>
                <Check className="h-4.5 w-4.5" />
                <span>En Favoritos</span>
              </>
            ) : (
              <>
                <Plus className="h-4.5 w-4.5" />
                <span>Mi Lista</span>
              </>
            )}
          </button>

          <button
            onClick={() => onSelectAnime(active)}
            className="flex items-center justify-center h-12 w-12 rounded-xl bg-black/30 backdrop-blur-md border border-white/10 text-neutral-300 hover:text-white hover:bg-white/10 transition"
            title="Más información"
          >
            <Info className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="absolute right-6 bottom-6 hidden sm:flex space-x-2 z-15">
        <button
          onClick={handlePrev}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-neutral-400 hover:text-white hover:bg-white/10 active:scale-95 transition"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={handleNext}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-neutral-400 hover:text-white hover:bg-white/10 active:scale-95 transition"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Slider Indicators */}
      <div className="absolute left-1/2 bottom-3 -translate-x-1/2 flex space-x-1.5 z-10">
        {featuredAnimes.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setActiveIndex(idx)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              activeIndex === idx ? "w-6 bg-rose-500" : "w-1.5 bg-neutral-600 hover:bg-neutral-400"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
