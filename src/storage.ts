// Camada de persistência. Com contas ativadas, os dados do guarda-roupa ficam
// na nuvem (Supabase, por usuário) — via cloudGet/cloudSet, que espelham a API
// do kv. A chave da API da Anthropic continua local (é um segredo do aparelho).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ClothingItem, DailyLook, SavedOutfit } from './types';
import { AvatarConfig, DEFAULT_AVATAR } from './avatar';
import { cloudGet, cloudSet } from './cloud';

const ITEMS_KEY = 'items';
const SAVED_KEY = 'savedOutfits';
const DAILY_KEY = 'dailyLooks';
const APIKEY_KEY = '@stylesense/anthropicKey';
const WEEKPLAN_KEY = 'weekPlan';
const AVATAR_KEY = 'avatar';

async function loadArray<T>(key: string, label: string): Promise<T[]> {
  try {
    const raw = await cloudGet(key);
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
    await cloudSet(key, JSON.stringify(value));
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

// Plano da semana: também sincroniza na nuvem (por usuário).
export async function loadWeekPlan(): Promise<Record<string, string>> {
  try {
    const raw = await cloudGet(WEEKPLAN_KEY);
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
    await cloudSet(WEEKPLAN_KEY, JSON.stringify(plan));
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

// Avatar do provador — sincroniza na nuvem (por usuário).
export async function loadAvatar(): Promise<AvatarConfig> {
  try {
    const raw = await cloudGet(AVATAR_KEY);
    if (!raw) return DEFAULT_AVATAR;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_AVATAR, ...parsed };
  } catch {
    return DEFAULT_AVATAR;
  }
}

export function saveAvatar(config: AvatarConfig): Promise<void> {
  return saveJson(AVATAR_KEY, config, 'avatar');
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
