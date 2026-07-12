export interface DownloadMetadata {
  id: string; // Episode ID (e.g., "one-piece-ep-1")
  animeId: string; // Anime ID (e.g., "one-piece")
  animeTitle: string;
  episodeNumber: number;
  episodeTitle: string;
  coverUrl: string;
  fileSizeMB: number;
  downloadedAt: string;
}

const DB_NAME = "megaAnimeDownloadsDb";
const DB_VERSION = 1;
const METADATA_STORE = "metadata";
const VIDEO_BLOBS_STORE = "videoBlobs";

function getDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        db.createObjectStore(METADATA_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(VIDEO_BLOBS_STORE)) {
        db.createObjectStore(VIDEO_BLOBS_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = (event: any) => {
      resolve(event.target.result);
    };

    request.onerror = (event: any) => {
      console.error("IndexedDB error:", event.target.error);
      reject(event.target.error);
    };
  });
}

// Save an episode download with its metadata and video blob
export async function saveEpisodeDownload(
  metadata: DownloadMetadata,
  videoBlob: Blob
): Promise<void> {
  const db = await getDb();
  
  return new Promise<void>((resolve, reject) => {
    // We use a transaction spanning both object stores to guarantee atomic integrity
    const transaction = db.transaction([METADATA_STORE, VIDEO_BLOBS_STORE], "readwrite");
    
    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = (event: any) => {
      console.error("Transaction save download error:", event.target.error);
      reject(event.target.error);
    };

    const metaStore = transaction.objectStore(METADATA_STORE);
    const blobStore = transaction.objectStore(VIDEO_BLOBS_STORE);

    metaStore.put(metadata);
    blobStore.put({ id: metadata.id, blob: videoBlob });
  });
}

// Get all downloaded episode metadata (lightweight, excludes the actual video Blobs)
export async function getDownloadedEpisodesList(): Promise<DownloadMetadata[]> {
  const db = await getDb();

  return new Promise<DownloadMetadata[]>((resolve, reject) => {
    const transaction = db.transaction([METADATA_STORE], "readonly");
    const store = transaction.objectStore(METADATA_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      // Return metadata sorted by download date descending
      const list = request.result || [];
      list.sort((a, b) => new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime());
      resolve(list);
    };

    request.onerror = (event: any) => {
      reject(event.target.error);
    };
  });
}

// Retrieve the actual video Blob for offline playback
export async function getDownloadedEpisodeBlob(episodeId: string): Promise<Blob | null> {
  const db = await getDb();

  return new Promise<Blob | null>((resolve, reject) => {
    const transaction = db.transaction([VIDEO_BLOBS_STORE], "readonly");
    const store = transaction.objectStore(VIDEO_BLOBS_STORE);
    const request = store.get(episodeId);

    request.onsuccess = () => {
      if (request.result && request.result.blob) {
        resolve(request.result.blob);
      } else {
        resolve(null);
      }
    };

    request.onerror = (event: any) => {
      reject(event.target.error);
    };
  });
}

// Delete a download from both stores
export async function deleteEpisodeDownload(episodeId: string): Promise<void> {
  const db = await getDb();

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([METADATA_STORE, VIDEO_BLOBS_STORE], "readwrite");

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = (event: any) => {
      reject(event.target.error);
    };

    transaction.objectStore(METADATA_STORE).delete(episodeId);
    transaction.objectStore(VIDEO_BLOBS_STORE).delete(episodeId);
  });
}

// Check if an episode is fully downloaded
export async function isEpisodeDownloaded(episodeId: string): Promise<boolean> {
  const db = await getDb();

  return new Promise<boolean>((resolve, reject) => {
    const transaction = db.transaction([METADATA_STORE], "readonly");
    const store = transaction.objectStore(METADATA_STORE);
    const request = store.getKey(episodeId);

    request.onsuccess = () => {
      resolve(request.result !== undefined);
    };

    request.onerror = () => {
      resolve(false);
    };
  });
}

// Calculate the total storage usage of downloads in megabytes
export async function getStorageUsageMB(): Promise<number> {
  const list = await getDownloadedEpisodesList();
  const sum = list.reduce((acc, curr) => acc + (curr.fileSizeMB || 0), 0);
  return Math.round(sum * 10) / 10;
}
