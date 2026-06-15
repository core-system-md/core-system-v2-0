// src/core/offline/CORE_SYSTEM_DRIVE.ts
// IndexedDB abstraction layer — offline-first data persistence

const DB_NAME = 'CORE_SYSTEM_DRIVE';
const DB_VERSION = 1;

interface StoreConfig {
  name: string;
  keyPath: string;
  indexes?: { name: string; keyPath: string; unique?: boolean }[];
}

const STORES: StoreConfig[] = [
  { name: 'patients', keyPath: 'id', indexes: [{ name: 'byTenant', keyPath: 'tenant_id' }] },
  { name: 'sessions', keyPath: 'id', indexes: [{ name: 'byTenant', keyPath: 'tenant_id' }] },
  { name: 'invoices', keyPath: 'id', indexes: [{ name: 'bySession', keyPath: 'session_id' }] },
  { name: 'procedures', keyPath: 'id', indexes: [{ name: 'byTenant', keyPath: 'tenant_id' }] },
  { name: 'mutations', keyPath: 'id', indexes: [{ name: 'byStatus', keyPath: 'status' }] },
];

class IndexedDBDrive {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        STORES.forEach((store) => {
          if (!db.objectStoreNames.contains(store.name)) {
            const objectStore = db.createObjectStore(store.name, { keyPath: store.keyPath });
            store.indexes?.forEach((idx) => {
              objectStore.createIndex(idx.name, idx.keyPath, { unique: idx.unique ?? false });
            });
          }
        });
      };
    });
  }

  async put<T>(storeName: string, value: T): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.put(value);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(storeName: string, id: string): Promise<T | undefined> {
    if (!this.db) throw new Error('DB not initialized');
    const tx = this.db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    if (!this.db) throw new Error('DB not initialized');
    const tx = this.db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }

  async getByIndex<T>(storeName: string, indexName: string, value: string): Promise<T[]> {
    if (!this.db) throw new Error('DB not initialized');
    const tx = this.db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    return new Promise((resolve, reject) => {
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, id: string): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName: string): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const coreDrive = new IndexedDBDrive();
