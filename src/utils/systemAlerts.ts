import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export interface GlobalBannerAlert {
  id?: string;
  active: boolean;
  message: string;
  type: "info" | "warning" | "promo";
  actionText?: string;
  actionUrl?: string;
  updatedAt?: string;
}

const LOCAL_ALERT_KEY = "megaAnime_global_banner";

/**
 * Fetches the active system banner alert
 */
export async function getGlobalBannerAlert(): Promise<GlobalBannerAlert | null> {
  try {
    const docRef = doc(db, "settings", "global_banner");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as GlobalBannerAlert;
    }
  } catch (error) {
    console.warn("Failed to fetch global banner from Firestore:", error);
  }

  // Fallback to local storage
  try {
    const cached = localStorage.getItem(LOCAL_ALERT_KEY);
    if (cached) return JSON.parse(cached);
  } catch (e) {}

  return {
    active: false,
    message: "¡Bienvenido a megaAnime! Disfruta del mejor catálogo de anime en Full HD.",
    type: "info"
  };
}

/**
 * Saves or updates the global banner alert from Admin Panel
 */
export async function saveGlobalBannerAlert(banner: GlobalBannerAlert): Promise<boolean> {
  const payload = {
    ...banner,
    updatedAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(LOCAL_ALERT_KEY, JSON.stringify(payload));
  } catch (e) {}

  try {
    const docRef = doc(db, "settings", "global_banner");
    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (error) {
    console.warn("Failed to save global banner to Firestore:", error);
    return true; // saved locally
  }
}
