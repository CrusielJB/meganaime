import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Dimensions
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Anime, Episode } from '../types';

const { width } = Dimensions.get('window');

interface PlayerScreenProps {
  anime: Anime;
  episode: Episode;
  onBack: () => void;
  onSelectEpisode: (episode: Episode) => void;
}

export function PlayerScreen({ anime, episode, onBack, onSelectEpisode }: PlayerScreenProps) {
  const [servers, setServers] = useState<{ name: string; url: string; quality?: string }[]>(episode.servers || []);
  const [activeServer, setActiveServer] = useState<{ name: string; url: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchServers = async () => {
      if (episode.servers && episode.servers.length > 0) {
        setServers(episode.servers);
        setActiveServer(episode.servers[0]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`https://megaanime-1c250.web.app/api/episode/${episode.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.servers && data.servers.length > 0) {
            setServers(data.servers);
            setActiveServer(data.servers[0]);
          }
        }
      } catch (e) {
        console.warn('Error loading episode servers:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchServers();
  }, [episode.id]);

  const episodes = anime.episodes || [];
  const currentIdx = episodes.findIndex((e) => e.id === episode.id);
  const prevEpisode = currentIdx > 0 ? episodes[currentIdx - 1] : null;
  const nextEpisode = currentIdx < episodes.length - 1 ? episodes[currentIdx + 1] : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Salir</Text>
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.headerAnimeTitle} numberOfLines={1}>{anime.title}</Text>
          <Text style={styles.headerEpisodeNumber}>Capítulo {episode.number}</Text>
        </View>
      </View>

      {/* Video Container */}
      <View style={styles.videoContainer}>
        {loading ? (
          <View style={styles.videoLoading}>
            <ActivityIndicator size="large" color="#e11d48" />
            <Text style={styles.videoLoadingText}>Cargando servidores de video...</Text>
          </View>
        ) : activeServer ? (
          <WebView
            source={{ uri: activeServer.url }}
            style={styles.webview}
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
          />
        ) : (
          <View style={styles.noServerBox}>
            <Text style={styles.noServerText}>No se encontraron servidores disponibles para este episodio.</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.controlsScroll}>
        {/* Next / Prev Buttons */}
        <View style={styles.episodeNavRow}>
          <TouchableOpacity
            style={[styles.navEpBtn, !prevEpisode && styles.navEpBtnDisabled]}
            disabled={!prevEpisode}
            onPress={() => prevEpisode && onSelectEpisode(prevEpisode)}
          >
            <Text style={styles.navEpBtnText}>⏮ Anterior</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navEpBtn, !nextEpisode && styles.navEpBtnDisabled]}
            disabled={!nextEpisode}
            onPress={() => nextEpisode && onSelectEpisode(nextEpisode)}
          >
            <Text style={styles.navEpBtnText}>Siguiente ⏭</Text>
          </TouchableOpacity>
        </View>

        {/* Server Selector */}
        {servers.length > 0 && (
          <View style={styles.serversSection}>
            <Text style={styles.serversTitle}>Servidores Disponibles:</Text>
            <View style={styles.serverChips}>
              {servers.map((s, idx) => {
                const isActive = activeServer?.url === s.url;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.serverChip, isActive && styles.serverChipActive]}
                    onPress={() => setActiveServer(s)}
                  >
                    <Text style={[styles.serverChipText, isActive && styles.serverChipTextActive]}>
                      {s.name || `Servidor ${idx + 1}`} {s.quality ? `(${s.quality})` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Anime Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>{episode.title || `${anime.title} - Episodio ${episode.number}`}</Text>
          <Text style={styles.infoSynopsis}>{anime.synopsis}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000'
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)'
  },
  backButton: {
    paddingVertical: 6,
    paddingRight: 14
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700'
  },
  headerTitles: {
    flex: 1
  },
  headerAnimeTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800'
  },
  headerEpisodeNumber: {
    color: '#e11d48',
    fontSize: 12,
    fontWeight: '600'
  },
  videoContainer: {
    width: width,
    height: width * 0.5625, // 16:9 ratio
    backgroundColor: '#050505'
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000'
  },
  videoLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  videoLoadingText: {
    color: '#a3a3a3',
    fontSize: 13,
    marginTop: 10
  },
  noServerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  noServerText: {
    color: '#ef4444',
    textAlign: 'center',
    fontSize: 14
  },
  controlsScroll: {
    padding: 16,
    paddingBottom: 40
  },
  episodeNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20
  },
  navEpBtn: {
    flex: 1,
    backgroundColor: '#171717',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  navEpBtnDisabled: {
    opacity: 0.3
  },
  navEpBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700'
  },
  serversSection: {
    marginBottom: 20
  },
  serversTitle: {
    color: '#d4d4d4',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10
  },
  serverChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  serverChip: {
    backgroundColor: '#171717',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  serverChipActive: {
    backgroundColor: '#e11d48',
    borderColor: '#e11d48'
  },
  serverChipText: {
    color: '#a3a3a3',
    fontSize: 12,
    fontWeight: '600'
  },
  serverChipTextActive: {
    color: '#ffffff',
    fontWeight: '800'
  },
  infoBox: {
    marginTop: 10,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)'
  },
  infoTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8
  },
  infoSynopsis: {
    color: '#a3a3a3',
    fontSize: 13,
    lineHeight: 20
  }
});
