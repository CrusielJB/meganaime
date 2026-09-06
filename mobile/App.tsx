import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HomeScreen } from './src/screens/HomeScreen';
import { DetailScreen } from './src/screens/DetailScreen';
import { PlayerScreen } from './src/screens/PlayerScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { FavoritesScreen } from './src/screens/FavoritesScreen';
import { MangaScreen } from './src/screens/MangaScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { Anime, Episode } from './src/types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'inicio' | 'buscar' | 'mangas' | 'favoritos'>('inicio');
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const saved = await AsyncStorage.getItem('megaAnime_native_user');
        if (saved) {
          setCurrentUser(JSON.parse(saved));
        }
      } catch (e) {
        console.warn('Error reading saved session:', e);
      }
    };
    loadSession();
  }, []);

  const handleToggleFavorite = async (animeId: string) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    const currentFavs = currentUser.favorites || [];
    const isFav = currentFavs.includes(animeId);
    const newFavs = isFav ? currentFavs.filter((id: string) => id !== animeId) : [...currentFavs, animeId];
    const updatedUser = { ...currentUser, favorites: newFavs };
    setCurrentUser(updatedUser);
    try {
      await AsyncStorage.setItem('megaAnime_native_user', JSON.stringify(updatedUser));
    } catch (e) {}
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* Screen Router */}
      {activeEpisode && selectedAnime ? (
        <PlayerScreen
          anime={selectedAnime}
          episode={activeEpisode}
          onBack={() => setActiveEpisode(null)}
          onSelectEpisode={(ep) => setActiveEpisode(ep)}
        />
      ) : selectedAnime ? (
        <DetailScreen
          anime={selectedAnime}
          onBack={() => setSelectedAnime(null)}
          onPlayEpisode={(ep) => setActiveEpisode(ep)}
          onToggleFavorite={handleToggleFavorite}
          isFavorite={currentUser?.favorites?.includes(selectedAnime.id)}
        />
      ) : showAuthModal ? (
        <AuthScreen
          onSuccess={(user) => {
            setCurrentUser(user);
            setShowAuthModal(false);
          }}
          onCancel={() => setShowAuthModal(false)}
        />
      ) : (
        <View style={styles.mainContainer}>
          <View style={styles.contentArea}>
            {activeTab === 'inicio' && (
              <HomeScreen
                onSelectAnime={(anime) => setSelectedAnime(anime)}
                onOpenSearch={() => setActiveTab('buscar')}
                onOpenAuth={() => setShowAuthModal(true)}
                currentUser={currentUser}
              />
            )}
            {activeTab === 'buscar' && (
              <SearchScreen
                onSelectAnime={(anime) => setSelectedAnime(anime)}
                onBack={() => setActiveTab('inicio')}
              />
            )}
            {activeTab === 'mangas' && (
              <MangaScreen onSelectManga={() => {}} />
            )}
            {activeTab === 'favoritos' && (
              <FavoritesScreen
                currentUser={currentUser}
                onSelectAnime={(anime) => setSelectedAnime(anime)}
                onOpenAuth={() => setShowAuthModal(true)}
              />
            )}
          </View>

          {/* Native Bottom Navigation Bar */}
          <SafeAreaView style={styles.bottomNavSafeArea}>
            <View style={styles.bottomNav}>
              <TouchableOpacity
                style={styles.navTab}
                onPress={() => setActiveTab('inicio')}
              >
                <Text style={[styles.navTabIcon, activeTab === 'inicio' && styles.navTabIconActive]}>🏠</Text>
                <Text style={[styles.navTabLabel, activeTab === 'inicio' && styles.navTabLabelActive]}>Inicio</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navTab}
                onPress={() => setActiveTab('buscar')}
              >
                <Text style={[styles.navTabIcon, activeTab === 'buscar' && styles.navTabIconActive]}>🔍</Text>
                <Text style={[styles.navTabLabel, activeTab === 'buscar' && styles.navTabLabelActive]}>Buscar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navTab}
                onPress={() => setActiveTab('mangas')}
              >
                <Text style={[styles.navTabIcon, activeTab === 'mangas' && styles.navTabIconActive]}>📖</Text>
                <Text style={[styles.navTabLabel, activeTab === 'mangas' && styles.navTabLabelActive]}>Manga</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navTab}
                onPress={() => setActiveTab('favoritos')}
              >
                <Text style={[styles.navTabIcon, activeTab === 'favoritos' && styles.navTabIconActive]}>❤️</Text>
                <Text style={[styles.navTabLabel, activeTab === 'favoritos' && styles.navTabLabelActive]}>Favoritos</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a'
  },
  mainContainer: {
    flex: 1
  },
  contentArea: {
    flex: 1
  },
  bottomNavSafeArea: {
    backgroundColor: '#121212'
  },
  bottomNav: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'space-around'
  },
  navTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    flex: 1
  },
  navTabIcon: {
    fontSize: 20,
    opacity: 0.6
  },
  navTabIconActive: {
    opacity: 1
  },
  navTabLabel: {
    color: '#a3a3a3',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600'
  },
  navTabLabelActive: {
    color: '#e11d48',
    fontWeight: '800'
  }
});
