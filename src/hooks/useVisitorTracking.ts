import { useEffect } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

/**
 * Tracks a real visitor session in Firestore `page_views` collection.
 * Fires once per browser session (uses sessionStorage flag).
 * Each document: { timestamp, date: "YYYY-MM-DD", sessionId, referrer, path }
 */
export function useVisitorTracking() {
  useEffect(() => {
    const SESSION_KEY = "mga_tracked";
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const today = new Date();
    const dateStr = today.toISOString().split("T")[0]; // "YYYY-MM-DD"
    const sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);

    addDoc(collection(db, "page_views"), {
      timestamp: serverTimestamp(),
      date: dateStr,
      sessionId,
      referrer: document.referrer || "direct",
      path: window.location.pathname
    }).catch(() => {
      // Silent fail — never block the UI for analytics
    });

    sessionStorage.setItem(SESSION_KEY, "1");
  }, []);
}
