import { useState, useEffect } from "react";
import { Anime } from "../types";

export function useCategoryData(activeTab: string) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [categoryResults, setCategoryResults] = useState<Anime[]>([]);
  const [loadingCategory, setLoadingCategory] = useState(false);
  const [categoryPage, setCategoryPage] = useState(1);

  useEffect(() => {
    setCategoryPage(1);
  }, [activeCategory]);

  useEffect(() => {
    if (activeTab !== "categorias" && activeTab !== "buscar") return;

    async function loadCategoryResults() {
      setLoadingCategory(true);
      try {
        const url = activeCategory 
          ? `/api/search?q=${encodeURIComponent(activeCategory)}&page=${categoryPage}`
          : `/api/search?page=${categoryPage}`;
        const res = await fetch(url);
        const data = await res.json();
        setCategoryResults(data);
      } catch (err) {
        console.error("Failed to load category data:", err);
      } finally {
        setLoadingCategory(false);
      }
    }

    loadCategoryResults();
  }, [activeCategory, categoryPage, activeTab]);

  return {
    activeCategory,
    setActiveCategory,
    categoryResults,
    setCategoryResults,
    loadingCategory,
    setLoadingCategory,
    categoryPage,
    setCategoryPage
  };
}
