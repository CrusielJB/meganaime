export interface ResolvedStream {
  url: string;
  isHls: boolean;
  headers?: Record<string, string>;
}

/**
 * Client-side interface to call our backend resolver.
 * Extracts direct MP4/M3U8 media links from third-party embed servers (Streamwish, Mp4Upload, VOE, etc.)
 */
export async function resolveEmbedUrl(serverName: string, embedUrl: string): Promise<ResolvedStream | null> {
  try {
    const cleanServer = serverName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    const res = await fetch(`/api/admin/resolve?server=${encodeURIComponent(cleanServer)}&url=${encodeURIComponent(embedUrl)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.url) {
        return data as ResolvedStream;
      }
    }
  } catch (e) {
    console.error("Failed to resolve embed URL on backend:", e);
  }
  return null;
}
