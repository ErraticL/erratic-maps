import type { MarkerIconDefinition } from "@/features/markers/domain/types";

const DB_NAME = "erratic-maps-markers";
const STORE_NAME = "custom-icons";
const DB_VERSION = 1;
const STORAGE_KEY = "icons";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function toStoredIcons(icons: MarkerIconDefinition[]) {
  return icons.map((icon) => ({
    id: icon.id,
    label: icon.label,
    source: icon.source,
    kind: icon.kind,
    dataUrl: icon.dataUrl,
    tintWithMarkerColor: Boolean(icon.tintWithMarkerColor),
  }));
}

export async function loadCustomMarkerIcons(): Promise<MarkerIconDefinition[]> {
  if (typeof indexedDB === "undefined") {
    return [];
  }

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(STORAGE_KEY);

    request.onsuccess = () => {
      db.close();
      const value = request.result;
      resolve(Array.isArray(value) ? (value as MarkerIconDefinition[]) : []);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export async function saveCustomMarkerIcons(
  icons: MarkerIconDefinition[],
): Promise<void> {
  if (typeof indexedDB === "undefined") {
    return;
  }

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(toStoredIcons(icons), STORAGE_KEY);

    request.onsuccess = () => {
      db.close();
      resolve();
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}
