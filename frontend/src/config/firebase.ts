import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Your Firebase config object
// Replace these values with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID || process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with proper persistence for native vs web
let authInstance: ReturnType<typeof getAuth>;
if (Platform.OS === 'web') {
  authInstance = getAuth(app);
} else {
  try {
    // Dynamically require to avoid TS/module resolution issues if subpath doesn't exist
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getReactNativePersistence } = require('firebase/auth/react-native');
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    }) as unknown as ReturnType<typeof getAuth>;
  } catch (e) {
    // Fallback to default auth without RN persistence
    authInstance = getAuth(app);
  }
}

// Initialize Firestore with transport fallbacks to avoid WebChannel errors
const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});

// Export the app and auth instances
export { db };
export const auth = authInstance;
export { app };
