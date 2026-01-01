/**
 * IndexedDB utility for persisting workspace state
 * Future: Can be replaced with local file storage (.idea-like) for desktop app
 *
 * Stores: visibleNodeIds, cardPositions, transform
 */

const DB_NAME = 'vibe-code-viewer';
const STORE_NAME = 'workspace-state';
const DB_VERSION = 1;

export interface WorkspaceState {
  visibleNodeIds: string[];
  cardPositions: [string, { x: number; y: number }][];
  transform: { k: number; x: number; y: number };
}

/**
 * Initialize IndexedDB
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Save workspace state to IndexedDB
 */
export async function saveWorkspaceState(state: WorkspaceState): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    store.put(state, 'workspace');

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Failed to save workspace state:', error);
    throw error;
  }
}

/**
 * Load workspace state from IndexedDB
 */
export async function loadWorkspaceState(): Promise<WorkspaceState | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get('workspace');

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        db.close();
        resolve(request.result || null);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Failed to load workspace state:', error);
    return null;
  }
}

/**
 * Clear workspace state from IndexedDB
 */
export async function clearWorkspaceState(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    store.delete('workspace');

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Failed to clear workspace state:', error);
    throw error;
  }
}
