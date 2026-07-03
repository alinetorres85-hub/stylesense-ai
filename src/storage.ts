// Camada de persistência local (local-first) usando AsyncStorage.
// No futuro isto pode ser trocado por uma API/backend sem alterar as telas.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ClothingItem, DailyLook, SavedOutfit } from './types';

const ITEMS_KEY = '@stylesense/items';
const SAVED_KEY = '@stylesense/savedOutfits';
const DAILY_KEY = '@stylesense/dailyLooks';
const APIKEY_KEY = '@stylesense/anthropicKey';
const WEEKPLAN_KEY = '@stylesense/weekPlan';

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

export async function loadItems(): Promise<ClothingItem[]> {
  try {
    const raw = await AsyncStorage.getItem(ITEMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Falha ao carregar peças', e);
    return [];
  }
}

export async function saveItems(items: ClothingItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('Falha ao salvar peças', e);
  }
}

export async function loadSavedOutfits(): Promise<SavedOutfit[]> {
  try {
    const raw = await AsyncStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Falha ao carregar looks salvos', e);
    return [];
  }
}

export async function saveSavedOutfits(outfits: SavedOutfit[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(outfits));
  } catch (e) {
    console.warn('Falha ao salvar looks', e);
  }
}

export async function loadDailyLooks(): Promise<DailyLook[]> {
  try {
    const raw = await AsyncStorage.getItem(DAILY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Falha ao carregar looks do dia', e);
    return [];
  }
}

export async function saveDailyLooks(looks: DailyLook[]): Promise<void> {
  try {
    await AsyncStorage.setItem(DAILY_KEY, JSON.stringify(looks));
  } catch (e) {
    console.warn('Falha ao salvar looks do dia', e);
  }
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
