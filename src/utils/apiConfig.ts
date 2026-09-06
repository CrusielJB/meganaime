/**
 * Helper to resolve API endpoints seamlessly across Web and Native Capacitor Apps (Android / iOS / Android TV).
 * When running inside a native WebView (capacitor://localhost or https://localhost), relative /api requests target production.
 */
export function isNativePlatform(): boolean {
  if (typeof window === "undefined") return false;
  
  // 1. Official Capacitor Plugin / Global Check
  const cap = (window as any).Capacitor;
  if (cap) {
    if (typeof cap.isNativePlatform === "function" && cap.isNativePlatform()) return true;
    if (typeof cap.getPlatform === "function" && cap.getPlatform() !== "web") return true;
  }

  // 2. URL Protocol & Origin Check
  const origin = window.location.origin.toLowerCase();
  const href = window.location.href.toLowerCase();
  
  return (
    origin.startsWith("capacitor:") ||
    origin.startsWith("file:") ||
    origin.includes("ionic:") ||
    href.includes("capacitor://") ||
    (origin.includes("localhost") && !origin.includes(":5173") && !origin.includes(":3000"))
  );
}

export const PRODUCTION_API_URL = "https://mega-anime.com";

export function getApiUrl(path: string): string {
  if (!path) return path;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  
  if (isNativePlatform()) {
    return `${PRODUCTION_API_URL}${cleanPath}`;
  }
  return cleanPath;
}

/**
 * Installs a global fetch interceptor at app startup.
 * Automatically transforms relative `/api/...` fetch calls to live Firebase API URL
 * when running inside Capacitor Native WebViews (iOS and Android).
 */
export function setupNativeFetchInterceptor(): void {
  if (typeof window === "undefined") return;

  if (isNativePlatform()) {
    const originalFetch = window.fetch;
    window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
      let targetInput = input;
      if (typeof input === "string") {
        if (input.startsWith("/api") || input.startsWith("api/")) {
          const path = input.startsWith("/") ? input : `/${input}`;
          targetInput = `${PRODUCTION_API_URL}${path}`;
        }
      } else if (input instanceof URL && input.pathname.startsWith("/api")) {
        targetInput = new URL(`${PRODUCTION_API_URL}${input.pathname}${input.search}`);
      } else if (typeof Request !== "undefined" && input instanceof Request) {
        try {
          const urlObj = new URL(input.url);
          if (urlObj.pathname.startsWith("/api")) {
            targetInput = new Request(`${PRODUCTION_API_URL}${urlObj.pathname}${urlObj.search}`, input);
          }
        } catch (e) {}
      }
      return originalFetch.call(this, targetInput, init);
    };
    console.log(`[Capacitor API Interceptor] Native fetch interceptor initialized -> /api calls redirected to ${PRODUCTION_API_URL}`);
  }
}

