import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.crraveleyton.app',
  appName: 'Crrave Leyton',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
