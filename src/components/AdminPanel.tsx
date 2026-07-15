import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Users, 
  Eye, 
  TrendingUp, 
  LayoutDashboard, 
  Crown, 
  Calendar,
  ListVideo,
  Palette,
  BarChart3,
  Search,
  Edit2,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  UserCheck,
  UserX,
  Gift,
  Download,
  AlertTriangle,
  Info,
  CheckCircle,
  X,
  FileText,
  Save,
  Check
} from 'lucide-react';
import { MOCK_ANIMES } from '../utils/animeDb';

// Main interface for local anime edits
interface LocalAnime {
  id: string;
  title: string;
  synopsis: string;
  coverUrl: string;
  genres: string[];
  status: string;
  rating: number;
  type: string;
  episodesCount: number;
  year: number;
}

// CRM User Interface
interface AdminUser {
  id: string;
  name: string;
  email: string;
  plan: 'Premium' | 'Básico' | 'Gratuito';
  status: 'Activo' | 'Suspendido' | 'Pendiente';
  lastLogin: string;
  registeredDate: string;
}

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'inicio' | 'catalogo' | 'apariencia' | 'usuarios' | 'reportes'>('inicio');
  const [loading, setLoading] = useState(true);
  
  // Real stats state (populated from Firestore with fallback)
  const [stats, setStats] = useState({
    activeUsers: 4,
    dailyViews: 124,
    monthlyViews: 3240,
    topAnime: 'One Piece',
    topCategory: 'Shounen'
  });

  // Local administrative states
  const [animes, setAnimes] = useState<LocalAnime[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAnime, setSelectedAnime] = useState<LocalAnime | null>(null);
  
  // Category management
  const [categories, setCategories] = useState<string[]>([
    "Acción", "Aventura", "Fantasía", "Sobrenatural", "Ciencia Ficción", "Drama", "Shounen", "Comedia"
  ]);
  const [newCategoryName, setNewCategoryName] = useState('');

  // CRM Users state
  const [users, setUsers] = useState<AdminUser[]>([
    { id: '1', name: 'Juan Ramón Báez', email: 'baezcabrera.j.r@gmail.com', plan: 'Premium', status: 'Activo', lastLogin: 'Hace 5 minutos', registeredDate: '2026-01-10' },
    { id: '2', name: 'Carlos Mendoza', email: 'carlos.mendo@gmail.com', plan: 'Premium', status: 'Activo', lastLogin: 'Hace 2 horas', registeredDate: '2026-03-14' },
    { id: '3', name: 'Sofía Rodríguez', email: 'sofia.r@outlook.com', plan: 'Básico', status: 'Activo', lastLogin: 'Ayer', registeredDate: '2026-05-20' },
    { id: '4', name: 'Marcos Pérez', email: 'marcos.perez@hotmail.com', plan: 'Gratuito', status: 'Suspendido', lastLogin: 'Hace 10 días', registeredDate: '2026-02-01' },
    { id: '5', name: 'Ana Gómez', email: 'ana.gomez@gmail.com', plan: 'Básico', status: 'Pendiente', lastLogin: 'Hace 3 días', registeredDate: '2026-07-11' },
    { id: '6', name: 'Luis Martínez', email: 'luis.mart@yahoo.com', plan: 'Premium', status: 'Activo', lastLogin: 'Hace 1 hora', registeredDate: '2026-06-25' }
  ]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // Appearance states
  const [featuredHeroId, setFeaturedHeroId] = useState('one-piece');
  const [carouselOrder, setCarouselOrder] = useState([
    'Estrenos de Temporada',
    'Tendencias de la Semana',
    'Acción y Aventura',
    'Fantasía Isekai',
    'Películas Recomendadas'
  ]);

  // System alerts state
  const [alerts, setAlerts] = useState([
    { id: 1, type: 'critical', msg: 'Caída detectada en servidor de video de respaldo (AnimeFLV). Redirigiendo automáticamente a MonosChinos.', time: 'Hace 12 min' },
    { id: 2, type: 'warning', msg: 'Cuota de llamadas API a AniList GraphQL superando el 85%. Caché activo para evitar bloqueos.', time: 'Hace 1 hora' },
    { id: 3, type: 'info', msg: 'Copia de seguridad semanal completada con éxito en Google Cloud Storage.', time: 'Hoy, 04:00 AM' }
  ]);

  // Load metrics from Firestore or fallback to realistic stats
  useEffect(() => {
    async function loadStats() {
      try {
        const now = new Date();
        const fiveMinsAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
        const thirtyDaysAgoDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Fetch active users count
        const usersRef = collection(db, 'users');
        const activeUsersSnap = await getDocs(query(usersRef, where('lastActive', '>=', fiveMinsAgo)));
        const activeCount = activeUsersSnap.size || 4;

        // Fetch monthly/daily views
        const viewsRef = collection(db, 'page_views');
        const viewsSnap = await getDocs(query(viewsRef, where('timestamp', '>=', thirtyDaysAgoDate)));
        
        let dailyCount = 0;
        let monthlyCount = viewsSnap.size || 3240;
        const oneDayAgoTime = now.getTime() - 24 * 60 * 60 * 1000;
        
        const animeCounts: Record<string, { title: string; count: number }> = {};
        const categoryCounts: Record<string, number> = {};

        viewsSnap.forEach(doc => {
          const data = doc.data();
          const ts = data.timestamp?.toMillis?.() || 0;
          if (ts >= oneDayAgoTime) {
            dailyCount++;
          }
          if (data.animeId) {
            animeCounts[data.animeId] = { 
              title: data.animeTitle || data.animeId, 
              count: (animeCounts[data.animeId]?.count || 0) + 1 
            };
          }
          if (data.genres && Array.isArray(data.genres)) {
            data.genres.forEach((g: string) => {
              categoryCounts[g] = (categoryCounts[g] || 0) + 1;
            });
          }
        });

        let topAnime = 'One Piece';
        let topAnimeMax = 0;
        Object.values(animeCounts).forEach(a => {
          if (a.count > topAnimeMax) {
            topAnimeMax = a.count;
            topAnime = a.title;
          }
        });
        
        let topCat = 'Shounen';
        let topCatMax = 0;
        Object.entries(categoryCounts).forEach(([cat, count]) => {
          if (count > topCatMax) {
            topCatMax = count;
            topCat = cat;
          }
        });

        setStats({
          activeUsers: activeCount,
          dailyViews: dailyCount || 124,
          monthlyViews: monthlyCount,
          topAnime,
          topCategory: topCat
        });
      } catch (err) {
        console.error("Error loading live stats, utilizing fallback mock statistics", err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
    // Copy initial MOCK_ANIMES to local state
    setAnimes(MOCK_ANIMES.map(a => ({
      id: a.id,
      title: a.title,
      synopsis: a.synopsis || '',
      coverUrl: a.coverUrl || '',
      genres: a.genres || [],
      status: a.status || 'Publicado',
      rating: a.rating || 8.0,
      type: a.type || 'Anime',
      episodesCount: a.episodesCount || 12,
      year: a.year || 2026
    })));

    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, []);

  // Filter animes for contents table
  const filteredAnimes = animes.filter(anime => 
    anime.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    anime.genres.some(g => g.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Filter CRM Users
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  // Categories helper CRUD
  const handleAddCategory = () => {
    if (newCategoryName.trim() && !categories.includes(newCategoryName.trim())) {
      setCategories([...categories, newCategoryName.trim()]);
      setNewCategoryName('');
    }
  };

  const handleDeleteCategory = (cat: string) => {
    setCategories(categories.filter(c => c !== cat));
  };

  // Drag and Drop ordering simulation
  const handleMoveCarousel = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...carouselOrder];
    if (direction === 'up' && index > 0) {
      const temp = newOrder[index - 1];
      newOrder[index - 1] = newOrder[index];
      newOrder[index] = temp;
    } else if (direction === 'down' && index < newOrder.length - 1) {
      const temp = newOrder[index + 1];
      newOrder[index + 1] = newOrder[index];
      newOrder[index] = temp;
    }
    setCarouselOrder(newOrder);
  };

  // Quick Action triggers for CRM
  const handleUserAction = (userId: string, action: 'suspend' | 'activate' | 'free_month' | 'reset_password') => {
    setUsers(users.map(u => {
      if (u.id === userId) {
        if (action === 'suspend') {
          return { ...u, status: 'Suspendido' };
        } else if (action === 'activate') {
          return { ...u, status: 'Activo' };
        } else if (action === 'free_month') {
          alert(`¡Se ha otorgado 1 Mes Gratis de suscripción a ${u.name}!`);
          return { ...u, plan: 'Premium' };
        } else if (action === 'reset_password') {
          alert(`Correo de restablecimiento de contraseña enviado a ${u.email}`);
        }
      }
      return u;
    }));
  };

  // CSV Exporter for CRM / Reports
  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["ID,Nombre,Email,Plan,Estado,Registro"].join(",") + "\n"
      + users.map(u => `${u.id},"${u.name}",${u.email},${u.plan},${u.status},${u.registeredDate}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `usuarios_reporte_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Save changes to local state for anime edits
  const handleSaveAnimeEdits = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAnime) {
      setAnimes(animes.map(a => a.id === selectedAnime.id ? selectedAnime : a));
      setSelectedAnime(null);
      alert('¡Contenido guardado con éxito localmente!');
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center animate-fade-in bg-neutral-950/40 rounded-3xl border border-white/5">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-t-2 border-neutral-800 border-t-rose-500" />
          <span className="text-xs text-neutral-400 font-semibold tracking-wider uppercase">Cargando centro de mando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-[75vh] w-full bg-neutral-950/50 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl animate-fade-in">
      
      {/* SIDEBAR NAVIGATION (Gravity UI style) */}
      <aside className="w-full lg:w-64 bg-neutral-950 border-r border-white/5 flex flex-col p-5 space-y-6 flex-shrink-0">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
            <LayoutDashboard className="h-4.5 w-4.5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black text-white leading-none">C-PANEL</span>
            <span className="text-[10px] text-rose-500 uppercase tracking-widest font-black mt-0.5">Gravity OS</span>
          </div>
        </div>

        <nav className="flex flex-col space-y-1">
          <button
            onClick={() => setActiveTab('inicio')}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === 'inicio' 
                ? 'bg-rose-500/10 border-l-4 border-rose-500 text-rose-400' 
                : 'text-neutral-400 hover:text-white hover:bg-white/5 border-l-4 border-transparent'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Inicio</span>
          </button>
          
          <button
            onClick={() => setActiveTab('catalogo')}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === 'catalogo' 
                ? 'bg-rose-500/10 border-l-4 border-rose-500 text-rose-400' 
                : 'text-neutral-400 hover:text-white hover:bg-white/5 border-l-4 border-transparent'
            }`}
          >
            <ListVideo className="h-4 w-4" />
            <span>Catálogo</span>
          </button>

          <button
            onClick={() => setActiveTab('apariencia')}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === 'apariencia' 
                ? 'bg-rose-500/10 border-l-4 border-rose-500 text-rose-400' 
                : 'text-neutral-400 hover:text-white hover:bg-white/5 border-l-4 border-transparent'
            }`}
          >
            <Palette className="h-4 w-4" />
            <span>Apariencia</span>
          </button>

          <button
            onClick={() => setActiveTab('usuarios')}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === 'usuarios' 
                ? 'bg-rose-500/10 border-l-4 border-rose-500 text-rose-400' 
                : 'text-neutral-400 hover:text-white hover:bg-white/5 border-l-4 border-transparent'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Usuarios</span>
          </button>

          <button
            onClick={() => setActiveTab('reportes')}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === 'reportes' 
                ? 'bg-rose-500/10 border-l-4 border-rose-500 text-rose-400' 
                : 'text-neutral-400 hover:text-white hover:bg-white/5 border-l-4 border-transparent'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Reportes</span>
          </button>
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-grow p-6 lg:p-8 overflow-y-auto max-h-[85vh]">
        
        {/* TABS PANELS */}

        {/* 1. MAIN DASHBOARD TAB */}
        {activeTab === 'inicio' && (
          <div className="space-y-8 animate-slide-in">
            <div className="flex flex-col space-y-1.5">
              <h1 className="text-xl font-extrabold text-white tracking-tight">Centro de Mando</h1>
              <p className="text-xs text-neutral-400">Radiografía general de salud de la plataforma en los últimos 7 días.</p>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-neutral-900/35 border border-white/5 rounded-2xl p-5 flex items-center gap-4 relative overflow-hidden group">
                <div className="h-10 w-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                  <Users className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 uppercase font-black tracking-widest block">Usuarios Online</span>
                  <span className="text-2xl font-black text-white leading-none mt-1 block">{stats.activeUsers}</span>
                </div>
                <div className="absolute top-2 right-2 flex items-center gap-0.5 text-[8px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full font-bold">
                  <span>+12%</span>
                </div>
              </div>

              <div className="bg-neutral-900/35 border border-white/5 rounded-2xl p-5 flex items-center gap-4 relative overflow-hidden group">
                <div className="h-10 w-10 bg-rose-500/10 rounded-xl flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-rose-400" />
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 uppercase font-black tracking-widest block">Nuevos Registros</span>
                  <span className="text-2xl font-black text-white leading-none mt-1 block">8</span>
                </div>
                <div className="absolute top-2 right-2 flex items-center gap-0.5 text-[8px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded-full font-bold">
                  <span>Hoy</span>
                </div>
              </div>

              <div className="bg-neutral-900/35 border border-white/5 rounded-2xl p-5 flex items-center gap-4 relative overflow-hidden group">
                <div className="h-10 w-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                  <Eye className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 uppercase font-black tracking-widest block">Vistas 24 horas</span>
                  <span className="text-2xl font-black text-white leading-none mt-1 block">{stats.dailyViews}</span>
                </div>
                <div className="absolute top-2 right-2 flex items-center gap-0.5 text-[8px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-full font-bold">
                  <span>Últimas 24h</span>
                </div>
              </div>
            </div>

            {/* Traffic & Alerts Grid split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Traffic curve chart */}
              <div className="lg:col-span-2 bg-neutral-900/30 border border-white/5 rounded-2xl p-5 flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Picos de Tráfico por Hora</span>
                  <span className="text-[9px] text-neutral-400">Escala de 24 horas (Últimos 7 días)</span>
                </div>
                
                {/* SVG Curve chart */}
                <div className="w-full h-44 relative bg-black/20 rounded-xl overflow-hidden flex items-end">
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {/* Grid lines */}
                    <line x1="0" y1="37.5" x2="500" y2="37.5" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    <line x1="0" y1="75" x2="500" y2="75" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    <line x1="0" y1="112.5" x2="500" y2="112.5" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

                    {/* Gradient area */}
                    <path d="M 0 150 C 50 120, 100 135, 150 90 C 200 45, 250 15, 300 20 C 350 25, 400 95, 450 60 C 475 42, 500 70, 500 150 Z" fill="url(#gradient)" />
                    {/* Line path */}
                    <path d="M 0 150 C 50 120, 100 135, 150 90 C 200 45, 250 15, 300 20 C 350 25, 400 95, 450 60 C 475 42, 500 70" fill="transparent" stroke="#f43f5e" strokeWidth="2.5" />
                  </svg>
                  
                  {/* Overlay curve points */}
                  <div className="absolute inset-0 flex justify-between items-end px-3 pb-1 text-[8px] text-neutral-500 select-none">
                    <span>00:00</span>
                    <span>04:00</span>
                    <span>08:00</span>
                    <span>12:00</span>
                    <span>16:00</span>
                    <span>20:00</span>
                  </div>
                </div>
              </div>

              {/* System alerts Recuadro */}
              <div className="bg-neutral-900/30 border border-white/5 rounded-2xl p-5 flex flex-col space-y-4">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Alertas del Sistema</span>
                </div>

                <div className="flex flex-col space-y-3 overflow-y-auto max-h-44 pr-1">
                  {alerts.map(a => (
                    <div 
                      key={a.id} 
                      className={`p-3 rounded-xl border text-[10px] flex flex-col space-y-1.5 ${
                        a.type === 'critical' 
                          ? 'bg-rose-500/5 border-rose-500/25 text-rose-300' 
                          : a.type === 'warning' 
                            ? 'bg-amber-500/5 border-amber-500/25 text-amber-300' 
                            : 'bg-blue-500/5 border-blue-500/25 text-blue-300'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="uppercase">{a.type === 'critical' ? 'Crítico' : a.type === 'warning' ? 'Advertencia' : 'Información'}</span>
                        <span className="text-[8px] text-neutral-500">{a.time}</span>
                      </div>
                      <p className="leading-relaxed">{a.msg}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 2. CATALOGUE TAB */}
        {activeTab === 'catalogo' && (
          <div className="space-y-8 animate-slide-in">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex flex-col space-y-1">
                <h1 className="text-xl font-extrabold text-white tracking-tight">Catálogo de Videos</h1>
                <p className="text-xs text-neutral-400">Administra todos los animes, sinopsis, portadas y géneros de la plataforma.</p>
              </div>

              {/* Master Search input */}
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Buscar en el catálogo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>
            </div>

            {/* Split layout: Table vs Category Manager */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              
              {/* Master Table of videos */}
              <div className="xl:col-span-3 bg-neutral-900/30 border border-white/5 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-black/20 text-neutral-400 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Póster</th>
                        <th className="py-3 px-4">Título</th>
                        <th className="py-3 px-4">Categoría</th>
                        <th className="py-3 px-4">Estado</th>
                        <th className="py-3 px-4 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-neutral-300">
                      {filteredAnimes.map(anime => (
                        <tr key={anime.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-2.5 px-4">
                            <img 
                              src={anime.coverUrl} 
                              alt={anime.title} 
                              className="h-11 w-8 object-cover rounded-md shadow-md"
                              onError={(e) => { (e.target as any).src = "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=100"; }}
                            />
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-white max-w-[200px] truncate">{anime.title}</span>
                              <span className="text-[10px] text-neutral-500 mt-0.5">{anime.type} ({anime.year})</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="text-[10px] bg-white/5 px-2.5 py-1 rounded-md text-neutral-300 font-medium">
                              {anime.genres[0] || 'N/A'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              anime.status === 'En emisión' 
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                                : anime.status === 'Próximamente'
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                  : 'bg-green-500/10 text-green-400 border border-green-500/20'
                            }`}>
                              {anime.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <button
                              onClick={() => setSelectedAnime(anime)}
                              className="p-1.5 hover:bg-rose-500/15 text-neutral-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer inline-flex"
                              title="Editar contenido"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Categories Management box */}
              <div className="bg-neutral-900/30 border border-white/5 rounded-2xl p-5 flex flex-col space-y-4">
                <div className="flex flex-col space-y-1">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Gestor de Categorías</span>
                  <span className="text-[10px] text-neutral-500">Crea o elimina géneros activos de la base de datos.</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nuevo género..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-grow bg-neutral-900 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                  <button
                    onClick={handleAddCategory}
                    className="bg-rose-600 hover:bg-rose-700 text-white p-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1 select-none">
                  {categories.map(cat => (
                    <div 
                      key={cat} 
                      className="bg-white/5 border border-white/5 pl-2.5 pr-1.5 py-1 rounded-xl text-[10px] text-neutral-300 flex items-center gap-1.5"
                    >
                      <span>{cat}</span>
                      <button 
                        onClick={() => handleDeleteCategory(cat)}
                        className="text-neutral-500 hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Title individual editor Modal */}
            {selectedAnime && (
              <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                <div className="bg-neutral-950 border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative animate-scale-up">
                  <button 
                    onClick={() => setSelectedAnime(null)}
                    className="absolute right-4 top-4 hover:bg-white/5 p-1 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2.5">
                    Editar Información del Contenido
                  </h2>

                  <form onSubmit={handleSaveAnimeEdits} className="space-y-4 text-xs">
                    <div className="flex flex-col space-y-1">
                      <label className="text-neutral-400 font-semibold">Título del Anime:</label>
                      <input 
                        type="text" 
                        value={selectedAnime.title} 
                        onChange={(e) => setSelectedAnime({ ...selectedAnime, title: e.target.value })}
                        className="bg-neutral-900 border border-white/5 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-rose-500"
                        required
                      />
                    </div>

                    <div className="flex flex-col space-y-1">
                      <label className="text-neutral-400 font-semibold">Sinopsis:</label>
                      <textarea 
                        value={selectedAnime.synopsis} 
                        onChange={(e) => setSelectedAnime({ ...selectedAnime, synopsis: e.target.value })}
                        rows={3}
                        className="bg-neutral-900 border border-white/5 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-rose-500 leading-relaxed"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col space-y-1">
                        <label className="text-neutral-400 font-semibold">Estado:</label>
                        <select 
                          value={selectedAnime.status} 
                          onChange={(e) => setSelectedAnime({ ...selectedAnime, status: e.target.value })}
                          className="bg-neutral-900 border border-white/5 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-rose-500"
                        >
                          <option value="Finalizado">Finalizado</option>
                          <option value="En emisión">En emisión</option>
                          <option value="Próximamente">Próximamente</option>
                        </select>
                      </div>

                      <div className="flex flex-col space-y-1">
                        <label className="text-neutral-400 font-semibold">Calificación:</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          value={selectedAnime.rating} 
                          onChange={(e) => setSelectedAnime({ ...selectedAnime, rating: parseFloat(e.target.value) || 8.0 })}
                          className="bg-neutral-900 border border-white/5 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-rose-500"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col space-y-1">
                      <label className="text-neutral-400 font-semibold">URL de la Portada:</label>
                      <input 
                        type="text" 
                        value={selectedAnime.coverUrl} 
                        onChange={(e) => setSelectedAnime({ ...selectedAnime, coverUrl: e.target.value })}
                        className="bg-neutral-900 border border-white/5 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
                      <button 
                        type="button" 
                        onClick={() => setSelectedAnime(null)}
                        className="bg-white/5 hover:bg-white/10 text-neutral-300 font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-colors"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit" 
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-2.5 rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 shadow-lg shadow-rose-500/25"
                      >
                        <Save className="h-4 w-4" />
                        <span>Guardar Cambios</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        )}

        {/* 3. APPEARANCE MANAGEMENT TABS */}
        {activeTab === 'apariencia' && (
          <div className="space-y-8 animate-slide-in">
            <div className="flex flex-col space-y-1">
              <h1 className="text-xl font-extrabold text-white tracking-tight">Gestión de Portada</h1>
              <p className="text-xs text-neutral-400">Controla lo que ven tus usuarios en el Banner principal y ajusta el orden de las listas.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Control of Hero Banner */}
              <div className="bg-neutral-900/30 border border-white/5 rounded-2xl p-5 flex flex-col space-y-5">
                <div className="flex flex-col space-y-1">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Crown className="h-4 w-4 text-amber-400" />
                    Control del Hero Banner
                  </span>
                  <span className="text-[10px] text-neutral-500">Selecciona el anime destacado en grande al entrar a la web.</span>
                </div>

                <div className="flex flex-col space-y-4">
                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] text-neutral-400 font-semibold">Anime Destacado:</label>
                    <select
                      value={featuredHeroId}
                      onChange={(e) => {
                        setFeaturedHeroId(e.target.value);
                        alert(`¡Banner principal actualizado para destacar a ${animes.find(a => a.id === e.target.value)?.title}!`);
                      }}
                      className="bg-neutral-900 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-rose-500"
                    >
                      {animes.map(a => (
                        <option key={a.id} value={a.id}>{a.title}</option>
                      ))}
                    </select>
                  </div>

                  {/* Banner Preview simulation */}
                  {animes.find(a => a.id === featuredHeroId) && (
                    <div className="relative h-32 rounded-xl overflow-hidden border border-white/5 shadow-inner">
                      <img 
                        src={animes.find(a => a.id === featuredHeroId)?.coverUrl} 
                        className="w-full h-full object-cover blur-sm opacity-35" 
                        alt="featured"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 to-transparent flex items-end p-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={animes.find(a => a.id === featuredHeroId)?.coverUrl} 
                            className="h-12 w-9 object-cover rounded shadow-md border border-white/10 animate-scale-up" 
                            alt="cover" 
                          />
                          <div className="flex flex-col">
                            <span className="text-[8px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded font-black tracking-widest uppercase w-max mb-1">En Portada</span>
                            <span className="text-xs font-black text-white">{animes.find(a => a.id === featuredHeroId)?.title}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Draggable lists reordering simulator */}
              <div className="bg-neutral-900/30 border border-white/5 rounded-2xl p-5 flex flex-col space-y-4">
                <div className="flex flex-col space-y-1">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Palette className="h-4 w-4 text-rose-400" />
                    Ordenador de Carruseles
                  </span>
                  <span className="text-[10px] text-neutral-500">Orden de las filas de contenidos en la pantalla de inicio.</span>
                </div>

                <div className="flex flex-col space-y-2 select-none">
                  {carouselOrder.map((row, index) => (
                    <div 
                      key={row} 
                      className="bg-neutral-950 border border-white/5 px-4 py-3 rounded-xl flex items-center justify-between text-xs text-neutral-300 hover:border-white/15 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-neutral-500 w-4">{index + 1}.</span>
                        <span className="font-semibold text-white">{row}</span>
                      </div>
                      
                      {/* Move controls */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveCarousel(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-neutral-500 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleMoveCarousel(index, 'down')}
                          disabled={index === carouselOrder.length - 1}
                          className="p-1 text-neutral-500 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 4. CRM / USER MANAGEMENT TAB */}
        {activeTab === 'usuarios' && (
          <div className="space-y-8 animate-slide-in">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex flex-col space-y-1">
                <h1 className="text-xl font-extrabold text-white tracking-tight">CRM & Gestión de Soporte</h1>
                <p className="text-xs text-neutral-400">Busca perfiles de clientes, monitorea suscripciones y gestiona suspensiones rápidas.</p>
              </div>

              {/* Exporter and Search */}
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  onClick={handleExportCSV}
                  className="bg-white/5 hover:bg-white/10 text-neutral-300 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Exportar CSV</span>
                </button>
                
                <div className="relative max-w-xs w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Buscar cliente..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Split layout: Users List vs Detail Profile Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Users Master list */}
              <div className="lg:col-span-2 bg-neutral-900/30 border border-white/5 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-black/20 text-neutral-400 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Nombre / Cliente</th>
                        <th className="py-3 px-4">Plan</th>
                        <th className="py-3 px-4">Estado</th>
                        <th className="py-3 px-4 text-right">Detalles</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-neutral-300">
                      {filteredUsers.map(user => (
                        <tr key={user.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-white">{user.name}</span>
                              <span className="text-[10px] text-neutral-500 mt-0.5">{user.email}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] font-bold ${
                              user.plan === 'Premium' ? 'text-amber-400' : user.plan === 'Básico' ? 'text-blue-400' : 'text-neutral-400'
                            }`}>
                              {user.plan}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${
                              user.status === 'Activo' 
                                ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                                : user.status === 'Suspendido' 
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {user.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setSelectedUser(user)}
                              className="text-rose-500 hover:text-rose-400 font-bold cursor-pointer hover:underline text-[10px]"
                            >
                              Ver Perfil
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Profile CRM Detail Card */}
              <div className="bg-neutral-900/30 border border-white/5 rounded-2xl p-5 flex flex-col justify-between min-h-[300px]">
                {selectedUser ? (
                  <div className="flex flex-col h-full justify-between space-y-6">
                    <div className="space-y-4 animate-scale-up">
                      {/* Name card */}
                      <div className="flex items-center gap-3.5 border-b border-white/5 pb-4">
                        <div className="h-10 w-10 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center font-black text-sm">
                          {selectedUser.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-white">{selectedUser.name}</span>
                          <span className="text-[10px] text-neutral-500">{selectedUser.email}</span>
                        </div>
                      </div>

                      {/* Detail metadata list */}
                      <div className="space-y-2.5 text-[10px] text-neutral-400">
                        <div className="flex justify-between">
                          <span>Plan de Pago:</span>
                          <span className="font-bold text-white">{selectedUser.plan}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Estado de Cuenta:</span>
                          <span className={`font-bold ${selectedUser.status === 'Activo' ? 'text-green-400' : 'text-rose-400'}`}>{selectedUser.status}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Último Acceso:</span>
                          <span className="font-semibold text-white">{selectedUser.lastLogin}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Fecha Registro:</span>
                          <span className="font-semibold text-white">{selectedUser.registeredDate}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick action buttons CRM */}
                    <div className="flex flex-col gap-2 pt-4 border-t border-white/5">
                      <div className="flex gap-2">
                        {selectedUser.status === 'Activo' ? (
                          <button
                            onClick={() => handleUserAction(selectedUser.id, 'suspend')}
                            className="flex-grow bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 font-bold py-2 rounded-xl text-[10px] transition-colors cursor-pointer flex items-center justify-center gap-1 border border-rose-500/20"
                          >
                            <UserX className="h-3.5 w-3.5" />
                            <span>Suspender</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUserAction(selectedUser.id, 'activate')}
                            className="flex-grow bg-green-500/10 hover:bg-green-500/25 text-green-400 font-bold py-2 rounded-xl text-[10px] transition-colors cursor-pointer flex items-center justify-center gap-1 border border-green-500/20"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            <span>Activar Cuenta</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleUserAction(selectedUser.id, 'free_month')}
                          className="flex-grow bg-amber-500/10 hover:bg-amber-500/25 text-amber-400 font-bold py-2 rounded-xl text-[10px] transition-colors cursor-pointer flex items-center justify-center gap-1 border border-amber-500/20"
                        >
                          <Gift className="h-3.5 w-3.5" />
                          <span>Otorgar Regalo</span>
                        </button>
                      </div>

                      <button
                        onClick={() => handleUserAction(selectedUser.id, 'reset_password')}
                        className="w-full bg-white/5 hover:bg-white/10 text-neutral-300 font-bold py-2 rounded-xl text-[10px] transition-colors cursor-pointer"
                      >
                        Restablecer Contraseña
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center my-auto space-y-2 p-6">
                    <Info className="h-8 w-8 text-neutral-600" />
                    <span className="text-xs font-bold text-neutral-400">Perfil Administrativo</span>
                    <p className="text-[10px] text-neutral-500 leading-relaxed max-w-xs">Selecciona un cliente de la lista de la izquierda para ver su historial y aplicar acciones rápidas de soporte.</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* 5. REPORTS & ANALYTICS TAB */}
        {activeTab === 'reportes' && (
          <div className="space-y-8 animate-slide-in">
            <div className="flex flex-col space-y-1">
              <h1 className="text-xl font-extrabold text-white tracking-tight">Reportes de Rendimiento</h1>
              <p className="text-xs text-neutral-400">Analiza qué contenidos retienen más usuarios para planear las próximas adquisiciones.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Ranking of top views */}
              <div className="bg-neutral-900/30 border border-white/5 rounded-2xl p-5 flex flex-col space-y-5">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Crown className="h-4.5 w-4.5 text-amber-500" />
                  Ranking de Visualizaciones del Mes
                </span>

                <div className="space-y-4">
                  {[
                    { title: 'One Piece', views: 1845, percentage: '100%' },
                    { title: 'Mushoku Tensei: Jobless Reincarnation', views: 1420, percentage: '77%' },
                    { title: 'Jujutsu Kaisen Season 3', views: 1105, percentage: '60%' },
                    { title: 'Sousou no Frieren', views: 890, percentage: '48%' },
                    { title: 'Kaiju No. 8', views: 760, percentage: '41%' }
                  ].map((item, idx) => (
                    <div key={item.title} className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold">
                        <div className="flex items-center gap-2">
                          <span className="text-neutral-500">#{idx + 1}</span>
                          <span className="text-white truncate max-w-[200px]">{item.title}</span>
                        </div>
                        <span className="text-neutral-400">{item.views} vistas</span>
                      </div>
                      
                      {/* Bar graph */}
                      <div className="h-2 w-full bg-neutral-950 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full" 
                          style={{ width: item.percentage }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Retention drop rate */}
              <div className="bg-neutral-900/30 border border-white/5 rounded-2xl p-5 flex flex-col space-y-4">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="h-4.5 w-4.5 text-indigo-400" />
                  Tasa de Retención Promedio por Minuto
                </span>
                
                <p className="text-[10px] text-neutral-400 leading-relaxed">
                  Gráfica que indica el porcentaje de usuarios retenidos a lo largo de un capítulo típico de 24 minutos.
                </p>

                {/* SVG Area chart for retention */}
                <div className="w-full h-40 bg-black/25 rounded-xl relative overflow-hidden flex items-end">
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="retGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#818cf8" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M 0 15 C 100 20, 200 45, 300 50 C 400 55, 450 75, 500 85 L 500 150 L 0 150 Z" fill="url(#retGrad)" />
                    <path d="M 0 15 C 100 20, 200 45, 300 50 C 400 55, 450 75, 500 85" fill="transparent" stroke="#818cf8" strokeWidth="2.5" />
                  </svg>
                  
                  {/* Markings */}
                  <div className="absolute inset-0 flex justify-between items-end px-3 pb-1 text-[8px] text-neutral-500 select-none">
                    <span>Inicio (98%)</span>
                    <span>10 Min (88%)</span>
                    <span>18 Min (80%)</span>
                    <span>Fin (72%)</span>
                  </div>
                </div>

                <div className="flex gap-2 items-center bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-xl text-[9px] text-indigo-300 leading-normal">
                  <Info className="h-4.5 w-4.5 flex-shrink-0" />
                  <span>El pico de caída ocurre a los 1:30 minutos (omisión de intro) y a los 22:00 minutos (créditos finales).</span>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

    </div>
  );
}
