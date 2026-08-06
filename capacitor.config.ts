import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor shell for Crystalline (Android APK + iOS Xcode project).
 * Web assets come from Vite `dist/` after `npm run build`.
 *
 * Bundle / package id: ca.departurebaydigital.crystalline
 * iOS IPA signing requires macOS + Xcode (or cloud CI); Linux scaffolds only.
 *
 * Note: Harbor has its own package id / dist-harbor via tools/build-android-harbor-apk.mjs
 * and must not leave this file pointing at Lantern Harbor after a harbor build.
 */
const config: CapacitorConfig = {
  appId: 'ca.departurebaydigital.crystalline',
  appName: 'Crystalline',
  webDir: 'dist',
  server: {
    // Load packaged assets; no remote URL
    androidScheme: 'https',
    iosScheme: 'https',
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0a0714',
  },
  ios: {
    backgroundColor: '#0a0714',
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scrollEnabled: false,
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
