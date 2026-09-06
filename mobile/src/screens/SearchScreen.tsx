import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
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

interface SearchScreenProps {
  onSelectAnime: (anime: Anime) => void;
  onBack: () => void;
}

export function SearchScreen({ onSelectAnime, onBack }: SearchScreenProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (!text || text.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`https://megaanime-1c250.web.app/api/search?q=${encodeURIComponent(text.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.results) {
          setResults(data.results);
        }
      }
    } catch (e) {
      console.warn('Search error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar anime, película, OVA..."
          placeholderTextColor="#666"
          value={query}
          onChangeText={handleSearch}
          autoFocus
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#e11d48" />
        </View>
      ) : results.length === 0 && query.trim().length >= 2 ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptyText}>No se encontraron resultados para "{query}"</Text>
        </View>
      ) : (
        <FlatList
          data={results}
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
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)'
  },
  backButton: {
    paddingRight: 12
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800'
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#171717',
    color: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  clearBtn: {
    paddingLeft: 10
  },
  clearBtnText: {
    color: '#9ca3af',
    fontSize: 16
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
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
