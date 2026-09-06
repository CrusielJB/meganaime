import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'net.megaanime.app',
  appName: 'megaAnime',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    allowNavigation: [
      'mega-anime.com',
      '*.mega-anime.com',
      'megaanime-1c250.web.app',
      'megaanime.net',
      '*.megaanime.net',
      '*.cloudfunctions.net',
      '*.tioanime.com',
      '*.monoschinos2.com',
      '*.mega.nz',
      '*.voe.sx',
      '*.streamwish.to',
      '*.mp4upload.com',
      '*.ok.ru',
      '*'
    ]
  },
  ios: {
    allowsLinkPreview: false,
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: false
  },
  plugins: {
    CapacitorCookies: {
      enabled: true
    }
  }
};

export default config;

