import { useState, useEffect, useCallback } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db, OperationType, handleFirestoreError } from "../lib/firebase";
import { Anime, Episode, User } from "../types";
import { safeLocalStorage } from "../utils/safeStorage";

export function useAnimeData(currentUser: User | null, setCurrentUser: (user: User | null) => void) {
  const [localFavorites, setLocalFavorites] = useState<string[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [trendingAnimes, setTrendingAnimes] = useState<Anime[]>([]);
  const [seasonalAnimes, setSeasonalAnimes] = useState<Anime[]>([]);
  const [movies, setMovies] = useState<Anime[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loadingHome, setLoadingHome] = useState(true);
  
  const [seasonalPage, setSeasonalPage] = useState(1);
  const [seasonalTotalPages, setSeasonalTotalPages] = useState(10);
  const [loadingSeasonal, setLoadingSeasonal] = useState(false);

  // Load home data
  useEffect(() => {
    async function loadHome() {
      setLoadingHome(true);
      try {
        const res = await fetch("/api/home?page=1");
        const data = await res.json();
        if (data.success) {
          setEpisodes(data.episodes || []);
          setTrendingAnimes(data.trending || []);
          setSeasonalAnimes(data.seasonal || []);
          if (data.totalPages) {
            setSeasonalTotalPages(data.totalPages);
          }
        }

        const moviesRes = await fetch("/api/movies");
        if (moviesRes.ok) {
          const moviesData = await moviesRes.json();
          if (Array.isArray(moviesData)) {
            const mapped = moviesData.map((m: any) => ({
              ...m,
              coverUrl: m.coverUrl || m.cover,
              bannerUrl: m.bannerUrl || m.banner || m.cover,
              rating: m.rating || 0,
              genres: m.genres || ["Película"],
              episodesCount: 1,
              type: "Película" as const,
              episodes: []
            }));
            
            // Prioritize 2026 movies
            const movies2026 = mapped.filter((m: any) => m.year === 2026);
            if (movies2026.length < 12) {
              const otherMovies = mapped.filter((m: any) => m.year !== 2026);
              setMovies([...movies2026, ...otherMovies].slice(0, 12));
            } else {
              setMovies(movies2026.slice(0, 12));
            }
          }
        }
      } catch (err) {
        console.error("Error loading home lists:", err);
      } finally {
        setLoadingHome(false);
      }
    }

    async function loadGenres() {
      try {
        const res = await fetch("/api/genres");
        const list = await res.json();
        setCategories(list);
      } catch (err) {
        console.error("Error loading genres list:", err);
      }
    }

    loadHome();
    loadGenres();
  }, []);

  // Load seasonal/airing page updates
  useEffect(() => {
    if (seasonalPage === 1) return; // Already loaded during loadHome on mount
    async function loadSeasonalPage() {
      setLoadingSeasonal(true);
      try {
        const res = await fetch(`/api/home?page=${seasonalPage}`);
        const data = await res.json();
        if (data.success && data.seasonal) {
          setSeasonalAnimes(data.seasonal);
          if (data.totalPages) {
            setSeasonalTotalPages(data.totalPages);
          }
        }
      } catch (err) {
        console.error("Error updating seasonal page:", err);
      } finally {
        setLoadingSeasonal(false);
      }
    }
    loadSeasonalPage();
  }, [seasonalPage]);

  // Sync favorites
  useEffect(() => {
    if (currentUser) {
      if (currentUser.profiles && currentUser.activeProfileId) {
        const activeProf = currentUser.profiles.find(p => p.id === currentUser.activeProfileId);
        setLocalFavorites(activeProf?.favorites || []);
      } else {
        setLocalFavorites(currentUser.favorites || []);
      }
    } else {
      try {
        const favs = safeLocalStorage.getItem("megaAnime_favs");
        if (favs) {
          try {
            setLocalFavorites(JSON.parse(favs));
          } catch (e) {
            setLocalFavorites([]);
          }
        } else {
          setLocalFavorites([]);
        }
      } catch (e) {
        setLocalFavorites([]);
      }
    }
  }, [currentUser, currentUser?.activeProfileId, currentUser?.profiles]);

  const saveFavorites = useCallback(async (updatedFavs: string[]) => {
    setLocalFavorites(updatedFavs);
    if (currentUser) {
      try {
        const userDocRef = doc(db, "users", currentUser.id);
        
        if (currentUser.profiles && currentUser.activeProfileId) {
          const updatedProfiles = currentUser.profiles.map(p => {
            if (p.id === currentUser.activeProfileId) {
              return { ...p, favorites: updatedFavs };
            }
            return p;
          });
          
          await setDoc(userDocRef, {
            profiles: updatedProfiles
          }, { merge: true });
          
          const updatedUser = { ...currentUser, profiles: updatedProfiles };
          setCurrentUser(updatedUser);
          try { safeLocalStorage.setItem("megaAnime_user", JSON.stringify(updatedUser)); } catch (e) {}
        } else {
          await setDoc(userDocRef, {
            favorites: updatedFavs
          }, { merge: true });
          
          const updatedUser = { ...currentUser, favorites: updatedFavs };
          setCurrentUser(updatedUser);
          try { safeLocalStorage.setItem("megaAnime_user", JSON.stringify(updatedUser)); } catch (e) {}
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.id}`);
      }
    } else {
      try { safeLocalStorage.setItem("megaAnime_favs", JSON.stringify(updatedFavs)); } catch (e) {}
    }
  }, [currentUser, setCurrentUser]);

  const toggleFavorite = useCallback((animeId: string) => {
    const isFav = localFavorites.includes(animeId);
    let updated: string[];
    if (isFav) {
      updated = localFavorites.filter(id => id !== animeId);
    } else {
      updated = [...localFavorites, animeId];
    }
    saveFavorites(updated);
  }, [localFavorites, saveFavorites]);

  return {
    localFavorites,
    setLocalFavorites,
    episodes,
    trendingAnimes,
    seasonalAnimes,
    movies,
    categories,
    loadingHome,
    toggleFavorite,
    saveFavorites,
    seasonalPage,
    setSeasonalPage,
    seasonalTotalPages,
    loadingSeasonal
  };
}
