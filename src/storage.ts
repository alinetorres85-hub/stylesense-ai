// Camada de persistência local (local-first).
// Nativo: AsyncStorage. Web: IndexedDB (via kv) para itens/looks/diário, porque
// nesses casos as fotos ficam embutidas como data URL e não cabem no localStorage.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ClothingItem, DailyLook, SavedOutfit } from './types';
import { kvGet, kvSet } from './kv';

const ITEMS_KEY = '@stylesense/items';
const SAVED_KEY = '@stylesense/savedOutfits';
const DAILY_KEY = '@stylesense/dailyLooks';
const APIKEY_KEY = '@stylesense/anthropicKey';
const WEEKPLAN_KEY = '@stylesense/weekPlan';

async function loadArray<T>(key: string, label: string): Promise<T[]> {
  try {
    const raw = await kvGet(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn(`Falha ao carregar ${label}`, e);
    return [];
  }
}

async function saveJson(key: string, value: unknown, label: string): Promise<void> {
  try {
    await kvSet(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Falha ao salvar ${label}`, e);
  }
}

export function loadItems(): Promise<ClothingItem[]> {
  return loadArray<ClothingItem>(ITEMS_KEY, 'peças');
}
export function saveItems(items: ClothingItem[]): Promise<void> {
  return saveJson(ITEMS_KEY, items, 'peças');
}

export function loadSavedOutfits(): Promise<SavedOutfit[]> {
  return loadArray<SavedOutfit>(SAVED_KEY, 'looks salvos');
}
export function saveSavedOutfits(outfits: SavedOutfit[]): Promise<void> {
  return saveJson(SAVED_KEY, outfits, 'looks salvos');
}

export function loadDailyLooks(): Promise<DailyLook[]> {
  return loadArray<DailyLook>(DAILY_KEY, 'looks do dia');
}
export function saveDailyLooks(looks: DailyLook[]): Promise<void> {
  return saveJson(DAILY_KEY, looks, 'looks do dia');
}

// Plano da semana e chave de API são pequenos — AsyncStorage/localStorage serve.
export async function loadWeekPlan(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(WEEKPLAN_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    console.warn('Falha ao carregar o plano da semana', e);
    return {};
  }
}

export async function saveWeekPlan(plan: Record<string, string>): Promise<void> {
  try {
    await AsyncStorage.setItem(WEEKPLAN_KEY, JSON.stringify(plan));
  } catch (e) {
    console.warn('Falha ao salvar o plano da semana', e);
  }
}

export async function loadApiKey(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(APIKEY_KEY)) ?? '';
  } catch {
    return '';
  }
}

export async function saveApiKey(key: string): Promise<void> {
  try {
    await AsyncStorage.setItem(APIKEY_KEY, key);
  } catch (e) {
    console.warn('Falha ao salvar a chave de API', e);
  }
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
