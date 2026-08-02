/**
 * Minimal localStorage shim for the Node vitest environment (no DOM). Only
 * salt.ts/consent.ts need it, and only the four methods they call.
 */
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

export function installLocalStoragePolyfill(): void {
  (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
}
