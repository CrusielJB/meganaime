import React, { useState, useEffect } from "react";
import { Search, Compass } from "lucide-react";
import AnimeCard from "./AnimeCard";
import { CategorySection } from "./CategorySection";
import { Anime } from "../types";
import { getProxyImageUrl, getAnimePlaceholder, recoverCoverImageInHotPath } from "../utils/imageUtils";

interface SearchSectionProps {
  categories: string[];
  trendingAnimes: Anime[];
  localFavorites: string[];
  onSelectAnime: (anime: Anime) => void;
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
}

export const SearchSection: React.FC<SearchSectionProps> = ({
  categories,
  trendingAnimes,
  localFavorites,
  onSelectAnime,
  onToggleFavorite,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Anime[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [categoryResults, setCategoryResults] = useState<Anime[]>([]);
  const [loadingCategory, setLoadingCategory] = useState(false);
  const [categoryPage, setCategoryPage] = useState(1);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Handle Suggestions (faster debounce)
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const suggestionTimeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggestions?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSuggestions(data);
      } catch (err) {
        console.error("Suggestions fetch failed:", err);
      }
    }, 300);

    return () => clearTimeout(suggestionTimeout);
  }, [searchQuery]);

  // Handle Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoadingSearch(true);
      setShowSuggestions(false); // Hide suggestions when full search starts
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(data);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoadingSearch(false);
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSuggestionClick = (title: string) => {
    setSearchQuery(title);
    setShowSuggestions(false);
  };

  // Handle Category Selection
  useEffect(() => {
    if (!activeCategory) {
      setCategoryResults([]);
      return;
    }

    async function loadCategoryResults() {
      setLoadingCategory(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(activeCategory)}&page=${categoryPage}`);
        const data = await res.json();
        setCategoryResults(data);
      } catch (err) {
        console.error("Failed to load category data:", err);
      } finally {
        setLoadingCategory(false);
      }
    }

    loadCategoryResults();
  }, [activeCategory, categoryPage]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col space-y-2">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Biblioteca y Buscador megaAnime</h1>
        <p className="text-xs text-neutral-400">Busca tus series y capítulos o navega por nuestra biblioteca de géneros.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <div className="lg:col-span-1 bg-neutral-900/40 border border-white/5 rounded-2xl p-4 space-y-4 lg:sticky lg:top-20">
          <div className="flex items-center space-x-2 border-b border-white/5 pb-2.5">
            <Compass className="h-4.5 w-4.5 text-rose-500" />
            <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider">Biblioteca</h3>
          </div>
          <div className="flex flex-wrap lg:flex-col gap-1.5 max-h-[160px] lg:max-h-[500px] overflow-y-auto pr-1">
            <button
              onClick={() => { setActiveCategory(null); setSearchQuery(""); }}
              className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-semibold transition ${!activeCategory && !searchQuery ? "bg-rose-500/10 border border-rose-500/20 text-rose-400" : "text-neutral-400 hover:text-white"}`}
            >
              ✨ Todo el Catálogo
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => { 
                  setActiveCategory(cat === activeCategory ? null : cat); 
                  setCategoryPage(1);
                  setSearchQuery(""); 
                }}
                className={`text-left px-3 py-1.5 rounded-xl text-xs font-semibold transition ${activeCategory === cat ? "bg-rose-500 text-white shadow-md shadow-rose-500/10" : "text-neutral-400 hover:text-white"}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="relative">
            <Search className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { 
                setSearchQuery(e.target.value); 
                if (e.target.value.trim()) {
                  setActiveCategory(null);
                  setShowSuggestions(true);
                } else {
                  setShowSuggestions(false);
                }
              }}
              onFocus={() => { if (searchQuery.trim().length >= 2) setShowSuggestions(true); }}
              onBlur={() => { 
                // Delay hiding suggestions to allow clicking on them
                setTimeout(() => setShowSuggestions(false), 200); 
              }}
              placeholder="Busca anime..."
              className="w-full rounded-2xl border border-white/5 bg-neutral-900 py-4 pl-12 text-sm text-white focus:border-rose-500/40 focus:outline-none transition-all focus:ring-4 focus:ring-rose-500/10"
            />

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-white/5 bg-neutral-900/95 backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-1">
                  {suggestions.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(item.title)}
                      className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-white/5 group"
                    >
                      <div className="h-12 w-9 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-800 border border-white/5">
                        <img 
                          src={getProxyImageUrl(item.coverUrl, item.title)} 
                          alt="" 
                          className="h-full w-full object-cover transition group-hover:scale-110"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            recoverCoverImageInHotPath(e, item.title, item.id);
                          }}
                        />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="truncate text-sm font-bold text-neutral-100 group-hover:text-rose-400 transition">
                          {item.title}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-bold text-rose-500/80 uppercase px-1.5 py-0.5 rounded bg-rose-500/10">
                            {item.type}
                          </span>
                          <span className="text-[10px] text-neutral-500 font-medium">
                            {item.year}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="border-t border-white/5 bg-white/5 p-2 px-4 flex items-center justify-between">
                   <span className="text-[10px] text-neutral-500 font-medium">Sugerencias rápidas</span>
                   <span className="text-[10px] text-rose-500 font-bold">Press Enter to search all</span>
                </div>
              </div>
            )}
          </div>

          {activeCategory ? (
            <CategorySection
              categories={[]}
              activeCategory={activeCategory}
              onSelectCategory={setActiveCategory}
              loading={loadingCategory}
              results={categoryResults}
              currentPage={categoryPage}
              totalPages={100}
              onPageChange={setCategoryPage}
              onSelectAnime={onSelectAnime}
              favorites={localFavorites}
              onToggleFavorite={onToggleFavorite}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {(loadingSearch ? [] : (searchQuery ? searchResults : trendingAnimes)).map((anime) => (
                <AnimeCard
                  key={anime.id}
                  anime={anime}
                  onSelect={onSelectAnime}
                  isFavorite={localFavorites.includes(anime.id)}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
              {loadingSearch && (
                 <div className="col-span-full flex justify-center py-12">
                   <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-2 border-neutral-800 border-t-rose-500" />
                 </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
