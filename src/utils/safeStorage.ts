class SafeMemoryStorage implements Storage {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store.hasOwnProperty(key) ? this.store[key] : null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }

  key(index: number): string | null {
    return Object.keys(this.store)[index] || null;
  }

  get length(): number {
    return Object.keys(this.store).length;
  }
}

function getSafeStorage(type: "localStorage" | "sessionStorage"): Storage {
  try {
    const storage = window[type];
    if (!storage) {
      return new SafeMemoryStorage();
    }
    // Test if we can actually use it
    const testKey = "__storage_test__";
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    return storage;
  } catch (e) {
    return new SafeMemoryStorage();
  }
}

export const safeLocalStorage = getSafeStorage("localStorage");
export const safeSessionStorage = getSafeStorage("sessionStorage");
