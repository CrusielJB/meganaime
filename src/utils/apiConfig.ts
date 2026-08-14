/**
 * Helper to resolve API endpoints seamlessly across Web and Native Capacitor Apps (Android / iOS / Android TV).
 * When running inside a native WebView (capacitor://localhost), relative /api requests must target production.
 */
export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (
      origin.startsWith("capacitor:") ||
      origin.startsWith("file:") ||
      origin.includes("ionic:")
    ) {
      return `https://megaanime.net${cleanPath}`;
    }
  }
  return cleanPath;
}
