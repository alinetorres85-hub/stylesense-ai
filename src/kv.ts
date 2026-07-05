// Chave-valor unificado: AsyncStorage no nativo; IndexedDB na web.
// Na web as fotos são guardadas como data URL dentro dos dados — o localStorage
// (usado pelo AsyncStorage web) tem ~5MB, então usamos IndexedDB (capacidade bem
// maior) para não estourar a cota.

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DB_NAME = 'stylesense';
const STORE = 'kv';

function openDb(): Promise<any> {
  return new Promise((resolve, reject) => {
    const idb = (globalThis as any).indexedDB;
    const req = idb.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key: string): Promise<string | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const r = tx.objectStore(STORE).get(key);
    r.onsuccess = () => resolve((r.result as string) ?? null);
    r.onerror = () => reject(r.error);
  });
}

async function idbSet(key: string, value: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

const isWeb = Platform.OS === 'web' && typeof (globalThis as any).indexedDB !== 'undefined';

export async function kvGet(key: string): Promise<string | null> {
  try {
    return isWeb ? await idbGet(key) : await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function kvSet(key: string, value: string): Promise<void> {
  try {
    if (isWeb) await idbSet(key, value);
    else await AsyncStorage.setItem(key, value);
  } catch (e) {
    console.warn('Falha ao salvar', key, e);
  }
}
