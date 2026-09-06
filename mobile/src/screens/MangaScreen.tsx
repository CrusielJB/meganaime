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

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 48) / 3;

interface MangaScreenProps {
  onSelectManga?: (manga: any) => void;
}

export function MangaScreen({ onSelectManga }: MangaScreenProps) {
  const [mangas, setMangas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMangas = async () => {
      try {
        const res = await fetch('https://megaanime-1c250.web.app/api/manga/latest?page=1');
        if (res.ok) {
          const data = await res.json();
          if (data && data.results) {
            setMangas(data.results);
          }
        }
      } catch (e) {
        console.warn('Error loading manga catalog:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchMangas();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📖 Catálogo de Manga</Text>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#e11d48" />
          <Text style={styles.loadingText}>Cargando mangas...</Text>
        </View>
      ) : mangas.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptyText}>No hay mangas disponibles en este momento.</Text>
        </View>
      ) : (
        <FlatList
          data={mangas}
          numColumns={3}
          keyExtractor={(item, idx) => item.id || String(idx)}
          contentContainerStyle={styles.resultsGrid}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.gridItem}
              activeOpacity={0.8}
              onPress={() => onSelectManga && onSelectManga(item)}
            >
              <Image source={{ uri: item.coverUrl || item.image }} style={styles.coverImg} resizeMode="cover" />
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
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  loadingText: {
    color: '#a3a3a3',
    fontSize: 13,
    marginTop: 10
  },
  emptyText: {
    color: '#737373',
    fontSize: 14,
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
