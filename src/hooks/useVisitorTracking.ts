import { useEffect } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

/**
 * Tracks a real visitor session in Firestore `page_views` collection.
 * Safe against missing storage, security rules or network issues.
 */
export function useVisitorTracking() {
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;

      const SESSION_KEY = "mga_tracked";
      try {
        if (sessionStorage.getItem(SESSION_KEY)) return;
      } catch (e) {
        // Storage access blocked or restricted
      }

      const today = new Date();
      const dateStr = today.toISOString().split("T")[0]; // "YYYY-MM-DD"
      const sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);

      addDoc(collection(db, "page_views"), {
        timestamp: serverTimestamp(),
        date: dateStr,
        sessionId,
        referrer: document.referrer || "direct",
        path: window.location.pathname
      }).catch((err) => {
        console.warn("Visitor tracking payload fail:", err);
      });

      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch (e) {}
    } catch (e) {
      console.warn("Visitor tracking exception:", e);
    }
  }, []);
}
