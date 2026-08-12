import React, { useState, useEffect, Component, ReactNode, ErrorInfo } from "react";
import { useAuth } from "./hooks/useAuth";
import { useAnimeData } from "./hooks/useAnimeData";
import { useAnimeNavigation } from "./hooks/useAnimeNavigation";
import { useCategoryData } from "./hooks/useCategoryData";
import { Anime, Episode, Manga } from "./types";
import Header from "./components/Header";
import AnimeDetail from "./components/AnimeDetail";
import VideoPlayer from "./components/VideoPlayer";
import { MangaDetail } from "./components/MangaDetail";
import AuthModal from "./components/AuthModal";
import AdminPanel from "./components/AdminPanel";
import { HomeSection } from "./components/HomeSection";
import { CategorySection } from "./components/CategorySection";
import { FavoriteSection } from "./components/FavoriteSection";
import { MangaSection } from "./components/MangaSection";
import { MovieSection } from "./components/MovieSection";
import { SearchSection } from "./components/SearchSection";
import { TheatreMode } from "./components/TheatreMode";
import ProfileSelector from "./components/ProfileSelector";
import { getAnimesWithEpisodes } from "./utils/animeDb";
import { safeLocalStorage, safeSessionStorage } from "./utils/safeStorage";
import { syncAllProgressFromFirestore, getAllLocalProgress } from "./utils/progress";
import { DownloadSection } from "./components/DownloadSection";
import { useVisitorTracking } from "./hooks/useVisitorTracking";


interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public props: ErrorBoundaryProps;
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    // If it's a chunk loading error (common after new deployments), clear session cache and auto-reload once
    if (error?.message?.includes("Failed to fetch dynamically imported module") || error?.message?.includes("Importing a module script failed")) {
      const lastReload = safeSessionStorage.getItem("megaAnime_chunk_reload");
      if (!lastReload || Date.now() - parseInt(lastReload, 10) > 10000) {
        safeSessionStorage.setItem("megaAnime_chunk_reload", Date.now().toString());
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-6">
            <div className="h-20 w-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto">
              <span className="text-4xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-black text-white">¡Ups! Algo salió mal</h1>
            <p className="text-neutral-400 text-sm">
              La aplicación ha detectado un cambio de versión o actualización. Haz clic abajo para restaurar la sesión limpia.
            </p>
            <div className="bg-black/50 p-4 rounded-xl border border-white/5 text-left overflow-auto max-h-40">
              <code className="text-xs text-rose-400 font-mono">
                {this.state.error?.message || "Error de versión de cliente React"}
              </code>
            </div>
            <div className="space-y-2">
              <button 
                onClick={() => {
                  try {
                    sessionStorage.clear();
                    localStorage.clear();
                    if ('caches' in window) {
                      caches.keys().then(names => {
                        names.forEach(name => caches.delete(name));
                      });
                    }
                  } catch (e) {}
                  window.location.href = window.location.origin;
                }}
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                Recargar y Actualizar Aplicación
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// MegaAnime App - Repositorio Sincronizado v1.0.1
export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<string>("inicio");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfilesModal, setShowProfilesModal] = useState(false);

  // Track real visitor session in Firestore (once per browser session)
  useVisitorTracking();
  
  // Custom Hooks
  const { 
    currentUser, 
    setCurrentUser, 
    loading,
    switchProfile, 
    createProfile, 
    updateProfile, 
    deleteProfile 
  } = useAuth();

  const {
    localFavorites,
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
  } = useAnimeData(currentUser, setCurrentUser);

  const {
    selectedAnime,
    setSelectedAnime,
    selectedManga,
    setSelectedManga,
    activeEpisodeId,
    setActiveEpisodeId,
    handleSelectAnime,
    handleNavigateEpisode,
    hasPrevEpisode,
    hasNextEpisode
  } = useAnimeNavigation();

  const {
    activeCategory,
    setActiveCategory,
    activeType,
    setActiveType,
    categoryResults,
    loadingCategory,
    categoryPage,
    setCategoryPage,
    totalPages: categoryTotalPages
  } = useCategoryData(activeTab);

  // Profile Selector flow - Netflix/Crunchyroll style
  const [hasSelectedProfile, setHasSelectedProfile] = useState(() => {
    return safeSessionStorage.getItem("megaAnime_profile_selected") === "true";
  });
  const [profileModalTab, setProfileModalTab] = useState<"profiles" | "security" | "preferences">("profiles");

  const [activeMangaChapterId, setActiveMangaChapterId] = useState<string | null>(null);

  // Smart TV D-Pad Remote Control keyboard listener
  useEffect(() => {
    function handleDpadNavigation(e: KeyboardEvent) {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        const focusable = Array.from(document.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ));
        const active = document.activeElement as HTMLElement;
        if (!active || !focusable.includes(active)) {
          if (focusable.length > 0) focusable[0].focus();
          return;
        }
        const index = focusable.indexOf(active);
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          const next = focusable[(index + 1) % focusable.length];
          next?.focus();
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          const prev = focusable[(index - 1 + focusable.length) % focusable.length];
          prev?.focus();
        }
      }
    }
    window.addEventListener("keydown", handleDpadNavigation);
    return () => window.removeEventListener("keydown", handleDpadNavigation);
  }, []);

  const handleResumeEpisode = React.useCallback(async (animeId: string, episodeId: string) => {
    const allAnimes = getAnimesWithEpisodes();
    let found = allAnimes.find(a => a.id === animeId);
    if (!found) {
      try {
        const res = await fetch(`/api/anime/${animeId}`);
        if (res.ok) {
          const data = await res.json();
          // Only use API result if it has a valid, non-generic title
          const apiTitle = data?.title?.toLowerCase()?.trim() || "";
          if (data && !data.error && apiTitle && apiTitle !== "consumet" && apiTitle !== "hianime") {
            found = data;
          }
        }
      } catch (err) {
        console.error("Error loading resume anime:", err);
      }
    }
    // If still not found (API offline or returned bad data), reconstruct from saved progress metadata
    if (!found) {
      const allProgress = getAllLocalProgress(currentUser);
      const savedProgress = allProgress.find(p => p.animeId === animeId || p.episodeId === episodeId);
      if (savedProgress) {
        const cleanTitle = savedProgress.animeTitle && 
          savedProgress.animeTitle.toLowerCase() !== "consumet" && 
          savedProgress.animeTitle.toLowerCase() !== "hianime"
            ? savedProgress.animeTitle
            : animeId.replace(/^(consumet-|hianime-)/g, "").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        
        found = {
          id: animeId,
          title: cleanTitle,
          synopsis: "",
          coverUrl: savedProgress.animeCoverUrl || "",
          bannerUrl: savedProgress.animeCoverUrl || "",
          genres: savedProgress.contentType === "movie" ? ["Película"] : ["Anime"],
          status: "En emisión",
          rating: 8.5,
          type: savedProgress.contentType === "movie" ? "Película" : "Anime",
          episodesCount: 1,
          year: 2026,
          episodes: [{ id: episodeId, title: `Episodio ${savedProgress.episodeNumber}`, number: savedProgress.episodeNumber, animeId, animeTitle: cleanTitle }]
        };
      }
    }
    if (found) {
      setSelectedAnime(found);
      setActiveEpisodeId(episodeId);
    }
  }, [setSelectedAnime, setActiveEpisodeId, currentUser]);

  // Toggle favorite with event (prompt auth for non-registered guest users)
  const handleToggleFavoriteWithEvent = (e: React.MouseEvent, animeId: string) => {
    e.stopPropagation();
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    toggleFavorite(animeId);
  };

  // Synchronize document title
  useEffect(() => {
    if (selectedAnime && activeEpisodeId) {
      const cleanEp = activeEpisodeId.split("-").pop();
      const epLabel = cleanEp && !isNaN(Number(cleanEp)) ? `Capítulo ${cleanEp}` : `Capítulo ${activeEpisodeId}`;
      document.title = `Reproduciendo ${selectedAnime.title} - ${epLabel} | megaAnime`;
    } else if (selectedAnime) {
      document.title = `${selectedAnime.title} | megaAnime`;
    } else {
      document.title = "megaAnime - Tu Portal de Anime de Alta Calidad";
    }
  }, [selectedAnime, activeEpisodeId]);

  // Sync all playback progress from Firestore when profile changes
  useEffect(() => {
    if (currentUser) {
      syncAllProgressFromFirestore(currentUser);
    }
  }, [currentUser?.id, currentUser?.activeProfileId]);

  // Auth success handler
  const handleAuthSuccess = (user: any) => {
    setCurrentUser(user);
    safeLocalStorage.setItem("megaAnime_user", JSON.stringify(user));
    setShowAuthModal(false);
    setHasSelectedProfile(false); // Trigger profiles overlay on login!
    safeSessionStorage.removeItem("megaAnime_profile_selected");

    // Merge any existing local/guest favorites into user account
    if (localFavorites.length > 0) {
      const mergedFavs = Array.from(new Set([...(user.favorites || []), ...localFavorites]));
      saveFavorites(mergedFavs);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setHasSelectedProfile(false);
    safeSessionStorage.removeItem("megaAnime_profile_selected");
  };

  // Full-screen profile selector overlays
  const showStartupProfiles = currentUser && !hasSelectedProfile;

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center space-y-4">
        <div className="h-12 w-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-black text-white tracking-widest uppercase animate-pulse">Cargando megaAnime...</span>
      </div>
    );
  }

  // First-time users land directly on Homepage in guest mode without full-screen auth wall
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-rose-500 selection:text-white pb-12">
      
      <Header
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setShowAuthModal(true)}
        onLogout={handleLogout}
        onOpenProfiles={(tab) => {
          setProfileModalTab(tab || "profiles");
          setShowProfilesModal(true);
        }}
        onSwitchProfile={switchProfile}
      />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        
        {activeTab === "inicio" && (
          <HomeSection
            trendingAnimes={trendingAnimes}
            seasonalAnimes={seasonalAnimes}
            movies={movies}
            latestEpisodes={episodes.map(e => ({ id: e.animeId, title: e.animeTitle, coverUrl: e.coverUrl } as Anime))}
            loading={loadingHome}
            onSelectAnime={handleSelectAnime}
            onSelectManga={setSelectedManga}
            favorites={localFavorites}
            onToggleFavorite={handleToggleFavoriteWithEvent}
            currentUser={currentUser}
            activeEpisodeId={activeEpisodeId}
            onResumeEpisode={handleResumeEpisode}
            onResumeManga={(manga, chapterId) => {
              setSelectedManga(manga);
              setActiveMangaChapterId(chapterId);
            }}
            seasonalPage={seasonalPage}
            seasonalTotalPages={seasonalTotalPages}
            loadingSeasonal={loadingSeasonal}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === "buscar" && (
          <SearchSection
            categories={categories}
            trendingAnimes={trendingAnimes}
            localFavorites={localFavorites}
            onSelectAnime={handleSelectAnime}
            onToggleFavorite={handleToggleFavoriteWithEvent}
          />
        )}

        {activeTab === "peliculas" && (
          <MovieSection
            onSelectAnime={handleSelectAnime}
            favorites={localFavorites}
            onToggleFavorite={handleToggleFavoriteWithEvent}
            categories={categories}
          />
        )}

        {activeTab === "categorias" && (
          <CategorySection
            categories={categories}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
            activeType={activeType}
            onSelectType={setActiveType}
            loading={loadingCategory}
            results={categoryResults}
            currentPage={categoryPage}
            totalPages={categoryTotalPages}
            onPageChange={setCategoryPage}
            onSelectAnime={handleSelectAnime}
            favorites={localFavorites}
            onToggleFavorite={handleToggleFavoriteWithEvent}
          />
        )}


        {activeTab === "favoritos" && (
          <FavoriteSection
            currentUser={currentUser}
            favorites={localFavorites}
            trendingAnimes={trendingAnimes}
            seasonalAnimes={seasonalAnimes}
            searchResults={[]}
            onSelectAnime={handleSelectAnime}
            onToggleFavorite={handleToggleFavoriteWithEvent}
            onShowAuth={() => setShowAuthModal(true)}
            onGoToHome={() => setActiveTab("inicio")}
          />
        )}

        {activeTab === "descargas" && (
          <DownloadSection
            onPlayEpisode={(episodeId, animeId) => {
              handleResumeEpisode(animeId, episodeId);
            }}
            onSelectAnimeById={async (animeId) => {
              const allAnimes = getAnimesWithEpisodes();
              let match = allAnimes.find(a => a.id === animeId);
              if (!match) {
                try {
                  const res = await fetch(`/api/anime/${animeId}`);
                  if (res.ok) {
                    const data = await res.json();
                    if (data && !data.error) {
                      match = data;
                    }
                  }
                } catch (e) {}
              }
              if (match) {
                setSelectedAnime(match);
              } else {
                setActiveTab("inicio");
              }
            }}
          />
        )}

        {activeTab === "mangas" && <MangaSection categories={categories} />}

        {activeTab === "admin" && currentUser?.isAdmin && currentUser?.email?.toLowerCase().trim() === "baezcabrera.j.r@gmail.com" && (
          <AdminPanel />
        )}

      </main>

      <TheatreMode
        selectedAnime={selectedAnime}
        selectedManga={selectedManga}
        activeEpisodeId={activeEpisodeId}
        activeMangaChapterId={activeMangaChapterId}
        localFavorites={localFavorites}
        onCloseAnime={() => setSelectedAnime(null)}
        onCloseManga={() => {
          setSelectedManga(null);
          setActiveMangaChapterId(null);
        }}
        onCloseEpisode={() => setActiveEpisodeId(null)}
        onPlayEpisode={(epId) => setActiveEpisodeId(epId)}
        onToggleFavorite={toggleFavorite}
        onNavigateEpisode={handleNavigateEpisode}
        hasPrevEpisode={hasPrevEpisode}
        hasNextEpisode={hasNextEpisode}
        onSelectAnime={setSelectedAnime}
        onSelectManga={setSelectedManga}
        currentUser={currentUser}
      />

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* Crunchyroll-style Profile Selection on startup/login */}
      {showStartupProfiles && (
        <ProfileSelector
          currentUser={currentUser}
          onSwitchProfile={(profileId) => {
            switchProfile(profileId);
            setHasSelectedProfile(true);
            safeSessionStorage.setItem("megaAnime_profile_selected", "true");
          }}
          onCreateProfile={createProfile}
          onUpdateProfile={updateProfile}
          onDeleteProfile={deleteProfile}
        />
      )}

      {/* Profile Manager triggered manually from Settings/Header dropdown */}
      {showProfilesModal && currentUser && (
        <ProfileSelector
          currentUser={currentUser}
          isSettingsMode={true}
          initialTab={profileModalTab}
          onSwitchProfile={(profileId) => {
            switchProfile(profileId);
            setShowProfilesModal(false);
          }}
          onCreateProfile={createProfile}
          onUpdateProfile={updateProfile}
          onDeleteProfile={deleteProfile}
          onClose={() => setShowProfilesModal(false)}
        />
      )}
    </div>
  );
}
