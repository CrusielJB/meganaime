import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  Dimensions
} from 'react-native';
import { Anime } from '../types';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 48) / 3;

interface FavoritesScreenProps {
  currentUser: any;
  onSelectAnime: (anime: Anime) => void;
  onOpenAuth: () => void;
}

export function FavoritesScreen({ currentUser, onSelectAnime, onOpenAuth }: FavoritesScreenProps) {
  const [favoriteAnimes, setFavoriteAnimes] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadFavorites = async () => {
      if (!currentUser || !currentUser.favorites || currentUser.favorites.length === 0) {
        setFavoriteAnimes([]);
        return;
      }
      setLoading(true);
      try {
        const promises = currentUser.favorites.slice(0, 30).map(async (id: string) => {
          const res = await fetch(`https://megaanime-1c250.web.app/api/anime/${id}`);
          if (res.ok) {
            return await res.json();
          }
          return null;
        });
        const list = (await Promise.all(promises)).filter(Boolean);
        setFavoriteAnimes(list);
      } catch (e) {
        console.warn('Error loading favorites list:', e);
      } finally {
        setLoading(false);
      }
    };

    loadFavorites();
  }, [currentUser]);

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authNoticeBox}>
          <Text style={styles.authNoticeTitle}>Guarda tus Animes Favoritos</Text>
          <Text style={styles.authNoticeSubtitle}>
            Inicia sesión con tu cuenta para acceder a tu historial y lista de animes guardados desde cualquier dispositivo.
          </Text>
          <TouchableOpacity style={styles.loginBtn} onPress={onOpenAuth}>
            <Text style={styles.loginBtnText}>Iniciar Sesión</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Favoritos ({currentUser.favorites?.length || 0})</Text>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#e11d48" />
        </View>
      ) : favoriteAnimes.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptyTitle}>Tu lista está vacía</Text>
          <Text style={styles.emptySubtitle}>Agrega animes pulsando el botón de ❤️ en cualquier serie.</Text>
        </View>
      ) : (
        <FlatList
          data={favoriteAnimes}
          numColumns={3}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.resultsGrid}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.gridItem}
              activeOpacity={0.8}
              onPress={() => onSelectAnime(item)}
            >
              <Image source={{ uri: item.coverUrl }} style={styles.coverImg} resizeMode="cover" />
              <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a'
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)'
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800'
  },
  authNoticeBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32
  },
  authNoticeTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center'
  },
  authNoticeSubtitle: {
    color: '#a3a3a3',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24
  },
  loginBtn: {
    backgroundColor: '#e11d48',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700'
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6
  },
  emptySubtitle: {
    color: '#737373',
    fontSize: 13,
    textAlign: 'center'
  },
  resultsGrid: {
    padding: 12
  },
  gridItem: {
    width: ITEM_WIDTH,
    margin: 4
  },
  coverImg: {
    width: '100%',
    height: ITEM_WIDTH * 1.45,
    borderRadius: 12,
    backgroundColor: '#171717'
  },
  itemTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4
  }
});
