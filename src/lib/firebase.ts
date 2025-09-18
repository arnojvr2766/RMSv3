// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB6xRGsbWDPi4lObWgNT_y7eOAddfyuuWk",
  authDomain: "rmsv3-becf7.firebaseapp.com",
  projectId: "rmsv3-becf7",
  storageBucket: "rmsv3-becf7.firebasestorage.app",
  messagingSenderId: "311883102380",
  appId: "1:311883102380:web:c2109f11bc35e832124709",
  measurementId: "G-9694NJ45D8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Connect to emulators in development
if (import.meta.env.DEV) {
  try {
    // Check if emulators are already connected by attempting to connect
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectStorageEmulator(storage, "127.0.0.1", 9199);
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
    console.log("🔥 Connected to Firebase emulators");
  } catch (error) {
    console.log("Firebase emulators already connected or not available:", error);
  }
}

// Initialize Analytics (only in browser environment)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;
