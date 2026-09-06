export interface Anime {
  id: string;
  title: string;
  synopsis?: string;
  coverUrl?: string;
  bannerUrl?: string;
  genres?: string[];
  status?: string;
  rating?: number;
  type?: string;
  episodesCount?: number;
  year?: number;
  episodes?: Episode[];
}

export interface Episode {
  id: string;
  title: string;
  number: number;
  animeId: string;
  animeTitle?: string;
  videoUrl?: string;
  servers?: { name: string; url: string; quality?: string }[];
}

export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  favorites?: string[];
  history?: any[];
  isAdmin?: boolean;
}
