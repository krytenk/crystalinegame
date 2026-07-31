import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor shell for Crystalline (Android APK / store packaging).
 * Web assets come from Vite `dist/` after `npm run build`.
 */
const config: CapacitorConfig = {
  appId: 'ca.departurebaydigital.crystalline',
  appName: 'Crystalline',
  webDir: 'dist',
  server: {
    // Load packaged assets; no remote URL
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0a0714',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#0a0714',
      showSpinner: false,
    },
  },
};

export default config;
