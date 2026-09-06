import { getApiUrl } from "./apiConfig";

export interface TelemetryDeviceInfo {
  deviceType: "Computadora" | "Móvil" | "Tablet" | "Smart TV" | "Otro";
  os: string;
  browser: string;
  screenResolution: string;
}

export function detectDeviceInfo(): TelemetryDeviceInfo {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      deviceType: "Computadora",
      os: "Desconocido",
      browser: "Navegador Web",
      screenResolution: "1920x1080"
    };
  }

  const ua = navigator.userAgent || "";
  let deviceType: TelemetryDeviceInfo["deviceType"] = "Computadora";
  
  if (/mobile/i.test(ua) && !/tablet|ipad/i.test(ua)) {
    deviceType = "Móvil";
  } else if (/tablet|ipad/i.test(ua) || (navigator.maxTouchPoints > 1 && /macintosh/i.test(ua))) {
    deviceType = "Tablet";
  } else if (/smart-tv|googletv|appletv|hbbtv|roku|crkey/i.test(ua)) {
    deviceType = "Smart TV";
  }

  let os = "Desconocido";
  if (/windows/i.test(ua)) os = "Windows";
  else if (/macintosh|mac os x/i.test(ua) && !/iphone|ipad/i.test(ua)) os = "macOS";
  else if (/iphone/i.test(ua)) os = "iOS (iPhone)";
  else if (/ipad/i.test(ua)) os = "iPadOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/linux/i.test(ua)) os = "Linux";
  else if (/cros/i.test(ua)) os = "ChromeOS";

  let browser = "Navegador Web";
  if (/edg/i.test(ua)) browser = "Microsoft Edge";
  else if (/opr|opera/i.test(ua)) browser = "Opera";
  else if (/chrome|crios/i.test(ua)) browser = "Google Chrome";
  else if (/firefox|fxios/i.test(ua)) browser = "Mozilla Firefox";
  else if (/safari/i.test(ua)) browser = "Apple Safari";
  else if (/samsungbrowser/i.test(ua)) browser = "Samsung Internet";

  const screenResolution = `${window.screen?.width || 0}x${window.screen?.height || 0}`;

  return {
    deviceType,
    os,
    browser,
    screenResolution
  };
}

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "server-session";
  const KEY = "megaAnime_live_sid";
  try {
    let sid = sessionStorage.getItem(KEY);
    if (!sid) {
      sid = "usr_" + Math.random().toString(36).slice(2, 10) + "_" + Date.now().toString(36);
      sessionStorage.setItem(KEY, sid);
    }
    return sid;
  } catch (e) {
    return "anon_" + Date.now();
  }
}

export async function sendTelemetryHeartbeat(data?: {
  currentPath?: string;
  currentAnimeTitle?: string;
  currentEpisode?: string;
  currentUser?: { id?: string; name?: string; email?: string; plan?: string } | null;
}) {
  if (typeof window === "undefined") return;

  const sessionId = getOrCreateSessionId();
  const device = detectDeviceInfo();

  const payload = {
    sessionId,
    currentPath: data?.currentPath || window.location.pathname,
    currentAnimeTitle: data?.currentAnimeTitle || "",
    currentEpisode: data?.currentEpisode || "",
    userId: data?.currentUser?.id || "",
    userName: data?.currentUser?.name || "",
    userEmail: data?.currentUser?.email || "",
    userPlan: data?.currentUser?.plan || "Gratuito",
    device
  };

  try {
    await fetch(getApiUrl("/api/telemetry/heartbeat"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(6000)
    });
  } catch (e) {}
}

export function sendTelemetryDisconnect() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return;
  const sessionId = getOrCreateSessionId();
  try {
    const url = getApiUrl("/api/telemetry/disconnect");
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, JSON.stringify({ sessionId }));
    } else {
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
        keepalive: true
      }).catch(() => {});
    }
  } catch (e) {}
}
