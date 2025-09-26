// Replace the firebaseConfig object with your Firebase web app config.
// You can find it in Firebase Console -> Project settings -> General -> Your apps (Web)
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
export const auth = getAuth(app);

// Detectar modo demo automáticamente
export const isDemoMode = 
  typeof window !== 'undefined' && 
  (window.location.hostname.includes('vercel.app') || 
   window.location.hostname.includes('github.io') ||
   import.meta.env.VITE_DEMO_MODE === 'true');

// Funciones para obtener colecciones según el modo
export const getAreasCollection = () => isDemoMode ? 'areas_demo' : 'areas';
export const getReportsCollection = () => isDemoMode ? 'monthly_reports_demo' : 'monthly_reports';