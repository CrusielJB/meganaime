import { useEffect } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { sendTelemetryHeartbeat, sendTelemetryDisconnect } from "../utils/telemetry";
import { User } from "../types";

/**
 * Tracks a real visitor session in Firestore `page_views` collection
 * AND maintains real-time active user telemetry heartbeat with server.
 */
export function useVisitorTracking(currentUser?: User | null, activeAnimeTitle?: string, activeEpisode?: string) {
  // 1. Initial Firestore Page View Log (Once per session)
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;

      const SESSION_KEY = "mga_tracked";
      try {
        if (!sessionStorage.getItem(SESSION_KEY)) {
          const today = new Date();
          const dateStr = today.toISOString().split("T")[0]; // "YYYY-MM-DD"
          const sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);

          addDoc(collection(db, "page_views"), {
            timestamp: serverTimestamp(),
            date: dateStr,
            sessionId,
            referrer: document.referrer || "direct",
            path: window.location.pathname
          }).catch(() => {});

          sessionStorage.setItem(SESSION_KEY, "1");
        }
      } catch (e) {}
    } catch (e) {}
  }, []);

  // 2. Real-Time Live Telemetry Heartbeat (Every 20 seconds + on navigation/watch change)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const sendHeartbeat = () => {
      sendTelemetryHeartbeat({
        currentPath: window.location.pathname,
        currentAnimeTitle: activeAnimeTitle || "",
        currentEpisode: activeEpisode || "",
        currentUser: currentUser ? {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          plan: currentUser.plan
        } : null
      });
    };

    // Initial heartbeat
    sendHeartbeat();

    // Recurring heartbeat every 20 seconds
    const interval = setInterval(sendHeartbeat, 20000);

    // Heartbeat on visibility change (when tab gains focus)
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Clean disconnect on page close/reload
    const onBeforeUnload = () => {
      sendTelemetryDisconnect();
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [currentUser?.id, currentUser?.name, currentUser?.email, currentUser?.plan, activeAnimeTitle, activeEpisode]);
}

