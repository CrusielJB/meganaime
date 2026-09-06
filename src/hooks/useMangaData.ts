import { useState, useEffect } from "react";
import { Manga } from "../types";
import { getApiUrl } from "../utils/apiConfig";
import { MOCK_MANGAS } from "../utils/mangaDb";

export function useMangaData() {
  const [mangas, setMangas] = useState<Manga[]>(() => MOCK_MANGAS.slice(0, 20));
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeGenre, setActiveGenre] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMangas() {
      try {
        let url = `/api/mangas?page=${page}`;
        if (activeGenre) {
          url += `&genre=${encodeURIComponent(activeGenre)}`;
        }
        const res = await fetch(getApiUrl(url), { signal: AbortSignal.timeout(6000) });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.mangas) && data.mangas.length > 0) {
            setMangas(data.mangas);
            setTotalPages(data.totalPages || 1);
          }
        }
      } catch (error) {
        console.error("Error fetching mangas, using local manga database fallback:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchMangas();
  }, [page, activeGenre]);

  return {
    mangas,
    loading,
    page,
    setPage,
    totalPages,
    activeGenre,
    setActiveGenre
  };
}
