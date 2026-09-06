import { initializeApp, getApps } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyCiOUFkE_JabN1ho29lZoxssj33TXHUZlg",
  authDomain: "megaanime-1c250.firebaseapp.com",
  projectId: "megaanime-1c250",
  storageBucket: "megaanime-1c250.firebasestorage.app",
  messagingSenderId: "642402487201",
  appId: "1:642402487201:web:0a0510b6bb43ea6fba99e0",
  measurementId: "G-BBJZ3N5P1C"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let authInstance: any;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (e) {
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const db = getFirestore(app);
