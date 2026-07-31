import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Firebase client config — these are PUBLIC keys, safe to embed in browser code.
// Values from: Firebase Console → Project Settings → General → Your apps → Web app
const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            || "AIzaSyCKaYRqUZJ9PILEl4geQxHCYyKRwcNwV5s",
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        || "moveon-845f9.firebaseapp.com",
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         || "moveon-845f9",
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     || "moveon-845f9.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "876510413626",
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID             || "1:876510413626:web:8db5699749d6c01a910603",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

