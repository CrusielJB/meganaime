export interface Episode {
  id: string; // e.g. "one-piece-1110" or from animeid
  title: string; // e.g. "Episodio 1110"
  number: number;
  animeId: string;
  animeTitle: string;
  coverUrl?: string;
  videoUrl?: string; // Player iframe or MP4 url
  videoServers?: Array<{ name: string; url: string }>;
  releaseDate?: string;
}

export interface Anime {
  id: string; // URL slug e.g. "one-piece"
  title: string;
  synopsis: string;
  coverUrl: string;
  bannerUrl: string;
  genres: string[];
  status: "En emisión" | "Finalizado" | "Próximamente";
  rating: number;
  type: "Anime" | "Película" | "OVA" | "Especial";
  episodesCount: number;
  year: number;
  episodes: Episode[];
  seasons?: Anime[];
  relatedMangas?: Manga[];
  title_romaji?: string;
  title_english?: string;
  title_native?: string;
  external_id?: string | number;
}

export interface Manga {
  id: string;
  title: string;
  synopsis: string;
  coverUrl: string;
  genres: string[];
  status: "En emisión" | "Finalizado" | "Próximamente";
  year: number;
  chaptersCount: number;
  rating: number;
}

export interface Profile {
  id: string;
  name: string;
  avatarUrl: string;
  favorites: string[]; // List of anime IDs for this profile
  history: Array<{ episodeId: string; watchedAt: string; progress: number }>; // History for this profile
  isChild?: boolean;
}

export interface User {
  id: string;
  username: string;
  email: string;
  favorites: string[]; // List of anime IDs (legacy/fallback)
  history: Array<{ episodeId: string; watchedAt: string; progress: number }>;
  isAdmin?: boolean;
  profiles?: Profile[]; // Multiple sub-profiles like Crunchyroll
  activeProfileId?: string; // ID of the currently active profile
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: Omit<User, "password">;
  token?: string;
}

export const GENRES_LIST = [
  "Acción",
  "Aventura",
  "Comedia",
  "Drama",
  "Fantasía",
  "Romance",
  "Ciencia Ficción",
  "Shounen",
  "Seinen",
  "Recuentos de la vida",
  "Terror",
  "Sobrenatural",
  "Misterio",
  "Psicológico",
  "Escolar",
  "Deportes",
  "Mecha",
  "Isekai"
];
