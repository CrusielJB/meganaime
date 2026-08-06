import { useState, useEffect } from "react";
import { Anime } from "../types";

export function useCategoryData(activeTab: string) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string>("todos");
  const [categoryResults, setCategoryResults] = useState<Anime[]>([]);
  const [loadingCategory, setLoadingCategory] = useState(false);
  const [categoryPage, setCategoryPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setCategoryPage(1);
  }, [activeCategory, activeType]);

  useEffect(() => {
    if (activeTab !== "categorias" && activeTab !== "buscar") return;

    async function loadCategoryResults() {
      setLoadingCategory(true);
      try {
        const params = new URLSearchParams();
        if (activeCategory) params.set("genre", activeCategory);
        if (activeType && activeType !== "todos") params.set("type", activeType);
        params.set("page", String(categoryPage));

        const res = await fetch(`/api/search?${params.toString()}`);
        const data = await res.json();

        const items = Array.isArray(data) ? data : (data.results || []);
        const pages = data.totalPages || 1;

        setCategoryResults(items);
        setTotalPages(pages);
      } catch (err) {
        console.error("Failed to load category data:", err);
        setCategoryResults([]);
      } finally {
        setLoadingCategory(false);
      }
    }

    loadCategoryResults();
  }, [activeCategory, activeType, categoryPage, activeTab]);

  return {
    activeCategory,
    setActiveCategory,
    activeType,
    setActiveType,
    categoryResults,
    setCategoryResults,
    loadingCategory,
    setLoadingCategory,
    categoryPage,
    setCategoryPage,
    totalPages
  };
}

