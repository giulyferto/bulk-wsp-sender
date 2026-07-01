import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "bulk-wsp-sender.firebaseapp.com",
  projectId: "bulk-wsp-sender",
  storageBucket: "bulk-wsp-sender.firebasestorage.app",
  messagingSenderId: "491159818084",
  appId: "1:491159818084:web:49d984397cf44c6a973471",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const clientAuth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
