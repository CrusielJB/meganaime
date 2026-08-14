/**
 * Helper to resolve API endpoints seamlessly across Web and Native Capacitor Apps (Android / iOS / Android TV).
 * When running inside a native WebView (capacitor://localhost), relative /api requests must target production.
 */
export function getApiUrl(path: string): string {
  if (!path) return path;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    const isNative =
      origin.startsWith("capacitor:") ||
      origin.startsWith("file:") ||
      origin.includes("ionic:") ||
      (origin.includes("localhost") && !origin.includes(":5173") && !origin.includes(":3000"));

    if (isNative) {
      return `https://megaanime.net${cleanPath}`;
    }
  }
  return cleanPath;
}

/**
 * Installs a global fetch interceptor at app startup.
 * Automatically transforms relative `/api/...` fetch calls to `https://megaanime.net/api/...`
 * when running inside Capacitor Native WebViews (iOS and Android).
 */
export function setupNativeFetchInterceptor(): void {
  if (typeof window === "undefined") return;

  const origin = window.location.origin;
  const isNative =
    origin.startsWith("capacitor:") ||
    origin.startsWith("file:") ||
    origin.includes("ionic:") ||
    (origin.includes("localhost") && !origin.includes(":5173") && !origin.includes(":3000"));

  if (isNative) {
    const originalFetch = window.fetch;
    window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
      let targetInput = input;
      if (typeof input === "string" && input.startsWith("/api")) {
        targetInput = `https://megaanime.net${input}`;
      } else if (input instanceof URL && input.pathname.startsWith("/api")) {
        targetInput = new URL(`https://megaanime.net${input.pathname}${input.search}`);
      } else if (typeof Request !== "undefined" && input instanceof Request) {
        try {
          const urlObj = new URL(input.url);
          if (urlObj.pathname.startsWith("/api")) {
            targetInput = new Request(`https://megaanime.net${urlObj.pathname}${urlObj.search}`, input);
          }
        } catch (e) {
          // If URL parsing fails, ignore
        }
      }
      return originalFetch.call(this, targetInput, init);
    };
    console.log("[Capacitor API Interceptor] Native fetch interceptor initialized -> /api calls redirected to https://megaanime.net");
  }
}

