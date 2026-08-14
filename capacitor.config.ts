import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'net.megaanime.app',
  appName: 'megaAnime',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    allowNavigation: [
      'megaanime.net',
      '*.megaanime.net',
      '*.cloudfunctions.net',
      '*.tioanime.com',
      '*.monoschinos2.com',
      '*'
    ]
  },
  plugins: {
    CapacitorCookies: {
      enabled: true
    }
  }
};

export default config;

