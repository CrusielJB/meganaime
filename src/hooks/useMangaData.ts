import { useState, useEffect } from "react";
import { Manga } from "../types";

export function useMangaData() {
  const [mangas, setMangas] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeGenre, setActiveGenre] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMangas() {
      setLoading(true);
      try {
        let url = `/api/mangas?page=${page}`;
        if (activeGenre) {
          url += `&genre=${encodeURIComponent(activeGenre)}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        setMangas(data.mangas || []);
        setTotalPages(data.totalPages || 1);
      } catch (error) {
        console.error("Error fetching mangas:", error);
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
