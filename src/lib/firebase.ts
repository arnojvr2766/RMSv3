// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

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

// Initialize Analytics (only in browser environment)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;
