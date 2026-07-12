import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Users, Eye, TrendingUp, LayoutDashboard, Crown, Calendar } from 'lucide-react';

export default function AdminPanel() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeUsers: 0,
    dailyViews: 0,
    monthlyViews: 0,
    topAnime: 'N/A',
    topCategory: 'N/A'
  });

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      try {
        const now = new Date();
        const fiveMinsAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(); // Not using firestore timestamp for simplicity, but ISO string works if we store as string
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

        // Note: In Firestore we saved lastActive as ISO string for user, but page_views timestamp is a ServerTimestamp.
        // We will fetch users for active users, and page_views for the rest.
        
        // Active Users (Logged in users active in last 5 mins)
        // Since we stored lastActive as ISO string, we can do string comparison
        const usersRef = collection(db, 'users');
        const activeUsersQ = query(usersRef, where('lastActive', '>=', fiveMinsAgo));
        const activeUsersSnap = await getDocs(activeUsersQ);
        const activeCount = activeUsersSnap.size;

        // For page_views we used serverTimestamp() which is a Firestore Timestamp object.
        // We need to use JS Date objects for comparison
        const viewsRef = collection(db, 'page_views');
        const thirtyDaysAgoDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        // We fetch all views from last 30 days to compute daily, monthly, and top lists.
        const viewsQ = query(viewsRef, where('timestamp', '>=', thirtyDaysAgoDate));
        const viewsSnap = await getDocs(viewsQ);
        
        let dailyCount = 0;
        let monthlyCount = viewsSnap.size;
        
        const animeCounts: Record<string, { title: string; count: number }> = {};
        const categoryCounts: Record<string, number> = {};

        const oneDayAgoTime = now.getTime() - 24 * 60 * 60 * 1000;

        viewsSnap.forEach(doc => {
          const data = doc.data();
          const ts = data.timestamp?.toMillis?.() || 0;
          
          if (ts >= oneDayAgoTime) {
            dailyCount++;
          }
          
          // Anime counts
          if (data.animeId) {
            if (!animeCounts[data.animeId]) {
              animeCounts[data.animeId] = { title: data.animeTitle || data.animeId, count: 0 };
            }
            animeCounts[data.animeId].count++;
          }
          
          // Genres counts
          if (data.genres && Array.isArray(data.genres)) {
            data.genres.forEach((g: string) => {
              categoryCounts[g] = (categoryCounts[g] || 0) + 1;
            });
          }
        });
        
        let topAnime = 'N/A';
        let topAnimeMax = 0;
        Object.values(animeCounts).forEach(a => {
          if (a.count > topAnimeMax) {
            topAnimeMax = a.count;
            topAnime = a.title;
          }
        });
        
        let topCat = 'N/A';
        let topCatMax = 0;
        Object.entries(categoryCounts).forEach(([cat, count]) => {
          if (count > topCatMax) {
            topCatMax = count;
            topCat = cat;
          }
        });

        setStats({
          activeUsers: activeCount,
          dailyViews: dailyCount,
          monthlyViews: monthlyCount,
          topAnime,
          topCategory: topCat
        });
      } catch (err) {
        console.error("Error fetching admin stats", err);
      } finally {
        setLoading(false);
      }
    }
    
    loadStats();
    // Set interval to refresh active users every 1 minute
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center animate-fade-in">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-t-2 border-neutral-800 border-t-rose-500" />
          <span className="text-sm text-neutral-400 font-semibold">Cargando Estadísticas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col space-y-2">
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <LayoutDashboard className="text-rose-500 h-6 w-6" />
          Panel de Administración
        </h1>
        <p className="text-xs text-neutral-400">Estadísticas en tiempo real y análisis de visualizaciones.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Active Users */}
        <div className="bg-neutral-900/40 border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-lg">
          <div className="h-12 w-12 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
            <Users className="h-6 w-6 text-green-400" />
          </div>
          <span className="text-3xl font-black text-white">{stats.activeUsers}</span>
          <span className="text-xs text-neutral-400 uppercase font-bold tracking-wider mt-1">Usuarios Online</span>
          <p className="text-[10px] text-neutral-500 mt-2">Usuarios logueados activos en últimos 5 min</p>
        </div>

        {/* Daily Views */}
        <div className="bg-neutral-900/40 border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-lg">
          <div className="h-12 w-12 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
            <Eye className="h-6 w-6 text-blue-400" />
          </div>
          <span className="text-3xl font-black text-white">{stats.dailyViews}</span>
          <span className="text-xs text-neutral-400 uppercase font-bold tracking-wider mt-1">Vistas Diarias</span>
          <p className="text-[10px] text-neutral-500 mt-2">Episodios reproducidos (Últimas 24h)</p>
        </div>

        {/* Monthly Views */}
        <div className="bg-neutral-900/40 border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-lg">
          <div className="h-12 w-12 bg-purple-500/10 rounded-full flex items-center justify-center mb-4">
            <Calendar className="h-6 w-6 text-purple-400" />
          </div>
          <span className="text-3xl font-black text-white">{stats.monthlyViews}</span>
          <span className="text-xs text-neutral-400 uppercase font-bold tracking-wider mt-1">Vistas Mensuales</span>
          <p className="text-[10px] text-neutral-500 mt-2">Episodios reproducidos (Últimos 30 días)</p>
        </div>

        {/* Top Anime */}
        <div className="bg-neutral-900/40 border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-lg lg:col-span-1 md:col-span-2">
          <div className="h-12 w-12 bg-rose-500/10 rounded-full flex items-center justify-center mb-4">
            <Crown className="h-6 w-6 text-rose-400" />
          </div>
          <span className="text-xl font-black text-white truncate w-full px-2">{stats.topAnime}</span>
          <span className="text-xs text-neutral-400 uppercase font-bold tracking-wider mt-1">Anime Más Visto</span>
          <p className="text-[10px] text-neutral-500 mt-2">Basado en reproducciones mensuales</p>
        </div>

        {/* Top Category */}
        <div className="bg-neutral-900/40 border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-lg lg:col-span-2 md:col-span-2">
          <div className="h-12 w-12 bg-amber-500/10 rounded-full flex items-center justify-center mb-4">
            <TrendingUp className="h-6 w-6 text-amber-400" />
          </div>
          <span className="text-2xl font-black text-white truncate">{stats.topCategory}</span>
          <span className="text-xs text-neutral-400 uppercase font-bold tracking-wider mt-1">Categoría Más Vista</span>
          <p className="text-[10px] text-neutral-500 mt-2">Género más popular de los últimos 30 días</p>
        </div>

      </div>
    </div>
  );
}
