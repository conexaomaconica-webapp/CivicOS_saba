import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.saas.platform',
  appName: 'SaaS Platform',
  webDir: '../web/out', // Next.js static export output
  server: {
    // During development, point to the Next.js dev server
    // url: 'http://192.168.1.X:3000',
    // cleartext: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
