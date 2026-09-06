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
  Dimensions,
  RefreshControl,
  SafeAreaView
} from 'react-native';
import { Anime } from '../types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.38;

interface HomeScreenProps {
  onSelectAnime: (anime: Anime) => void;
  onOpenSearch: () => void;
  onOpenAuth: () => void;
  currentUser: any;
}

export function HomeScreen({ onSelectAnime, onOpenSearch, onOpenAuth, currentUser }: HomeScreenProps) {
  const [trending, setTrending] = useState<Anime[]>([]);
  const [seasonal, setSeasonal] = useState<Anime[]>([]);
  const [movies, setMovies] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnimeData = async () => {
    try {
      // Connect to the megaAnime backend API
      const res = await fetch('https://megaanime-1c250.web.app/api/home-catalog');
      if (res.ok) {
        const data = await res.json();
        if (data.trending) setTrending(data.trending);
        if (data.seasonal) setSeasonal(data.seasonal);
        if (data.movies) setMovies(data.movies);
      }
    } catch (e) {
      console.warn('Error loading home data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnimeData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnimeData();
  };

  const featured = trending[0] || null;

  return (
    <SafeAreaView style={styles.container}>
      {/* App Header */}
      <View style={styles.header}>
        <Text style={styles.headerLogo}>
          mega<Text style={styles.headerHighlight}>Anime</Text>
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.searchButton} onPress={onOpenSearch}>
            <Text style={styles.searchButtonText}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileButton} onPress={onOpenAuth}>
            {currentUser ? (
              <Image source={{ uri: currentUser.avatarUrl || 'https://s4.anilist.co/file/anilistcdn/character/large/b127691-9zqh1xpIubn7.png' }} style={styles.avatarImg} />
            ) : (
              <View style={styles.loginBadge}>
                <Text style={styles.loginBadgeText}>Entrar</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e11d48" />}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#e11d48" />
            <Text style={styles.loadingText}>Cargando catálogo de megaAnime...</Text>
          </View>
        ) : (
          <>
            {/* Featured Hero Banner */}
            {featured && (
              <TouchableOpacity
                style={styles.featuredContainer}
                activeOpacity={0.9}
                onPress={() => onSelectAnime(featured)}
              >
                <Image
                  source={{ uri: featured.bannerUrl || featured.coverUrl }}
                  style={styles.featuredImage}
                  resizeMode="cover"
                />
                <View style={styles.featuredGradient}>
                  <Text style={styles.featuredTag}>★ DESTACADO</Text>
                  <Text style={styles.featuredTitle} numberOfLines={2}>{featured.title}</Text>
                  <Text style={styles.featuredSynopsis} numberOfLines={2}>
                    {featured.synopsis || 'Disfruta de esta serie en la más alta calidad HD sin interrupciones.'}
                  </Text>
                  <TouchableOpacity
                    style={styles.playHeroButton}
                    onPress={() => onSelectAnime(featured)}
                  >
                    <Text style={styles.playHeroButtonText}>▶ Ver Ahora</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}

            {/* Trending Carousel */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🔥 En Tendencia Hoy</Text>
              </View>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={trending}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.card}
                    activeOpacity={0.8}
                    onPress={() => onSelectAnime(item)}
                  >
                    <Image source={{ uri: item.coverUrl }} style={styles.cardImage} resizeMode="cover" />
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.cardRating}>★ {item.rating || '8.5'}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.listContent}
              />
            </View>

            {/* Seasonal Carousel */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>✨ Animes en Emisión</Text>
              </View>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={seasonal}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.card}
                    activeOpacity={0.8}
                    onPress={() => onSelectAnime(item)}
                  >
                    <Image source={{ uri: item.coverUrl }} style={styles.cardImage} resizeMode="cover" />
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.cardEpisodeCount}>
                        {item.episodesCount ? `${item.episodesCount} Caps` : 'En emisión'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.listContent}
              />
            </View>

            {/* Movies Carousel */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🎬 Películas de Anime</Text>
              </View>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={movies}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.card}
                    activeOpacity={0.8}
                    onPress={() => onSelectAnime(item)}
                  >
                    <Image source={{ uri: item.coverUrl }} style={styles.cardImage} resizeMode="cover" />
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.cardMovieBadge}>PELÍCULA</Text>
                    </View>
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.listContent}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)'
  },
  headerLogo: {
    fontSize: 24,
    fontWeight: '900',
    color: '#e11d48',
    letterSpacing: -0.5
  },
  headerHighlight: {
    color: '#ffffff'
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  searchButton: {
    padding: 8
  },
  searchButtonText: {
    fontSize: 18
  },
  profileButton: {
    padding: 4
  },
  avatarImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e11d48'
  },
  loginBadge: {
    backgroundColor: '#e11d48',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  loginBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  },
  scrollContent: {
    paddingBottom: 40
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center'
  },
  loadingText: {
    color: '#a3a3a3',
    fontSize: 14,
    marginTop: 12,
    fontWeight: '600'
  },
  featuredContainer: {
    height: 280,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative'
  },
  featuredImage: {
    width: '100%',
    height: '100%'
  },
  featuredGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: 'rgba(10, 10, 10, 0.85)'
  },
  featuredTag: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4
  },
  featuredTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4
  },
  featuredSynopsis: {
    color: '#a3a3a3',
    fontSize: 12,
    marginBottom: 12
  },
  playHeroButton: {
    backgroundColor: '#e11d48',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: 'flex-start'
  },
  playHeroButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700'
  },
  section: {
    marginTop: 24
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 12
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800'
  },
  listContent: {
    paddingHorizontal: 12
  },
  card: {
    width: CARD_WIDTH,
    marginHorizontal: 6
  },
  cardImage: {
    width: '100%',
    height: CARD_WIDTH * 1.45,
    borderRadius: 14,
    backgroundColor: '#171717'
  },
  cardInfo: {
    marginTop: 6
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  },
  cardRating: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2
  },
  cardEpisodeCount: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2
  },
  cardMovieBadge: {
    color: '#e11d48',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2
  }
});
