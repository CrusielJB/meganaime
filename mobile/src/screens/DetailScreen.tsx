import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  SafeAreaView
} from 'react-native';
import { Anime, Episode } from '../types';

interface DetailScreenProps {
  anime: Anime;
  onBack: () => void;
  onPlayEpisode: (episode: Episode) => void;
  onToggleFavorite?: (animeId: string) => void;
  isFavorite?: boolean;
}

export function DetailScreen({ anime, onBack, onPlayEpisode, onToggleFavorite, isFavorite }: DetailScreenProps) {
  const [episodes, setEpisodes] = useState<Episode[]>(anime.episodes || []);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  useEffect(() => {
    const fetchEpisodes = async () => {
      if (anime.episodes && anime.episodes.length > 0) return;
      setLoadingEpisodes(true);
      try {
        const res = await fetch(`https://megaanime-1c250.web.app/api/anime/${anime.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.episodes) {
            setEpisodes(data.episodes);
          }
        }
      } catch (e) {
        console.warn('Error loading anime details:', e);
      } finally {
        setLoadingEpisodes(false);
      }
    };

    fetchEpisodes();
  }, [anime.id]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        {onToggleFavorite && (
          <TouchableOpacity style={styles.favButton} onPress={() => onToggleFavorite(anime.id)}>
            <Text style={styles.favButtonText}>{isFavorite ? '❤️ En Favoritos' : '🤍 Guardar'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Banner & Cover */}
        <View style={styles.headerBox}>
          <Image
            source={{ uri: anime.bannerUrl || anime.coverUrl }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
          <View style={styles.coverRow}>
            <Image source={{ uri: anime.coverUrl }} style={styles.coverImage} resizeMode="cover" />
            <View style={styles.headerInfo}>
              <Text style={styles.animeTitle}>{anime.title}</Text>
              <View style={styles.tagsRow}>
                <Text style={styles.ratingBadge}>★ {anime.rating || '8.5'}</Text>
                <Text style={styles.statusBadge}>{anime.status || 'Finalizado'}</Text>
              </View>
              {anime.genres && (
                <Text style={styles.genresText} numberOfLines={1}>
                  {anime.genres.join(' • ')}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Synopsis */}
        <View style={styles.synopsisBox}>
          <Text style={styles.synopsisTitle}>Sinopsis</Text>
          <Text style={styles.synopsisText}>
            {anime.synopsis || 'No hay descripción disponible para este título.'}
          </Text>
        </View>

        {/* Episodes Section */}
        <View style={styles.episodesBox}>
          <Text style={styles.episodesHeaderTitle}>
            Episodios ({episodes.length})
          </Text>

          {loadingEpisodes ? (
            <ActivityIndicator color="#e11d48" style={{ marginTop: 20 }} />
          ) : episodes.length === 0 ? (
            <Text style={styles.noEpisodesText}>No hay episodios disponibles.</Text>
          ) : (
            <FlatList
              data={episodes}
              scrollEnabled={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.episodeItem}
                  activeOpacity={0.7}
                  onPress={() => onPlayEpisode(item)}
                >
                  <View style={styles.episodeNumberBox}>
                    <Text style={styles.episodeNumber}>#{item.number}</Text>
                  </View>
                  <View style={styles.episodeInfo}>
                    <Text style={styles.episodeTitle} numberOfLines={1}>
                      {item.title || `Capítulo ${item.number}`}
                    </Text>
                    <Text style={styles.episodeSubtitle}>Reproducir en HD</Text>
                  </View>
                  <Text style={styles.playIcon}>▶</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a'
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)'
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700'
  },
  favButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14
  },
  favButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600'
  },
  scrollContent: {
    paddingBottom: 40
  },
  headerBox: {
    position: 'relative'
  },
  bannerImage: {
    width: '100%',
    height: 180,
    opacity: 0.5
  },
  coverRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: -60,
    alignItems: 'flex-end',
    gap: 14
  },
  coverImage: {
    width: 110,
    height: 160,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#171717'
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 8
  },
  animeTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6
  },
  ratingBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  statusBadge: {
    backgroundColor: 'rgba(225, 29, 72, 0.2)',
    color: '#e11d48',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  genresText: {
    color: '#9ca3af',
    fontSize: 12
  },
  synopsisBox: {
    paddingHorizontal: 16,
    marginTop: 20
  },
  synopsisTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6
  },
  synopsisText: {
    color: '#a3a3a3',
    fontSize: 13,
    lineHeight: 20
  },
  episodesBox: {
    paddingHorizontal: 16,
    marginTop: 24
  },
  episodesHeaderTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12
  },
  noEpisodesText: {
    color: '#737373',
    fontSize: 14,
    marginTop: 10
  },
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171717',
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)'
  },
  episodeNumberBox: {
    backgroundColor: '#e11d48',
    borderRadius: 10,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  episodeNumber: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800'
  },
  episodeInfo: {
    flex: 1
  },
  episodeTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700'
  },
  episodeSubtitle: {
    color: '#9ca3af',
    fontSize: 11,
    marginTop: 2
  },
  playIcon: {
    color: '#e11d48',
    fontSize: 16,
    paddingHorizontal: 8
  }
});
