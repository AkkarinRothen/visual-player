import type { CapacitorConfig } from '@capacitor/cli';

const isDev = process.env.CAPACITOR_DEV === 'true';

const config: CapacitorConfig = {
  appId: 'com.akkarinrothen.visualplayer',
  appName: 'Visual Player',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: isDev,
  },
  android: {
    allowMixedContent: isDev,
    backgroundColor: '#090a0f',
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
  plugins: {
    StatusBar: {
      backgroundColor: '#090a0f',
      style: 'DARK',
    },
  },
};

export default config;
