// Estado global do guarda-roupa via React Context (local-first).

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  ClothingItem,
  DailyLook,
  Occasion,
  Outfit,
  SavedOutfit,
  Season,
  outfitPieces,
} from './types';

export interface SaveOutfitMeta {
  note?: string;
  occasions?: Occasion[];
  seasons?: Season[];
}
import {
  loadDailyLooks,
  loadItems,
  loadSavedOutfits,
  loadWeekPlan,
  newId,
  saveDailyLooks,
  saveItems,
  saveSavedOutfits,
  saveWeekPlan,
} from './storage';
import { deleteImageSafe } from './images';

interface WardrobeContextValue {
  items: ClothingItem[];
  savedOutfits: SavedOutfit[];
  dailyLooks: DailyLook[];
  loading: boolean;
  addItem: (item: Omit<ClothingItem, 'id' | 'createdAt' | 'wearCount'>) => ClothingItem;
  addItems: (items: Omit<ClothingItem, 'id' | 'createdAt' | 'wearCount'>[]) => void;
  updateItem: (id: string, patch: Partial<ClothingItem>) => void;
  removeItem: (id: string) => void;
  clearAll: () => void;
  markOutfitWorn: (outfit: Outfit) => void;
  saveOutfit: (outfit: Outfit, meta?: SaveOutfitMeta) => SavedOutfit;
  updateSavedOutfit: (id: string, patch: Partial<SavedOutfit>) => void;
  removeSavedOutfit: (id: string) => void;
  addDailyLook: (imageUri: string, note?: string) => void;
  removeDailyLook: (id: string) => void;
  weekPlan: Record<string, string>; // dateKey (YYYY-MM-DD) → savedOutfitId
  setPlanLook: (dateKey: string, savedOutfitId: string | null) => void;
}

const WardrobeContext = createContext<WardrobeContextValue | null>(null);

export function WardrobeProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([]);
  const [dailyLooks, setDailyLooks] = useState<DailyLook[]>([]);
  const [weekPlan, setWeekPlan] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [its, saved, daily, plan] = await Promise.all([
        loadItems(),
        loadSavedOutfits(),
        loadDailyLooks(),
        loadWeekPlan(),
      ]);
      setItems(its);
      setSavedOutfits(saved);
      setDailyLooks(daily);
      setWeekPlan(plan);
      setLoading(false);
    })();
  }, []);

  // Persiste sempre que muda (após carga inicial).
  useEffect(() => {
    if (!loading) saveItems(items);
  }, [items, loading]);
  useEffect(() => {
    if (!loading) saveSavedOutfits(savedOutfits);
  }, [savedOutfits, loading]);
  useEffect(() => {
    if (!loading) saveDailyLooks(dailyLooks);
  }, [dailyLooks, loading]);
  useEffect(() => {
    if (!loading) saveWeekPlan(weekPlan);
  }, [weekPlan, loading]);

  const addItem = useCallback<WardrobeContextValue['addItem']>((data) => {
    const item: ClothingItem = {
      ...data,
      id: newId(),
      createdAt: Date.now(),
      wearCount: 0,
    };
    setItems((prev) => [item, ...prev]);
    return item;
  }, []);

  const addItems = useCallback<WardrobeContextValue['addItems']>((datas) => {
    const now = Date.now();
    const created: ClothingItem[] = datas.map((data, idx) => ({
      ...data,
      id: newId(),
      createdAt: now + idx,
      wearCount: 0,
    }));
    setItems((prev) => [...created, ...prev]);
  }, []);

  const updateItem = useCallback<WardrobeContextValue['updateItem']>((id, patch) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }, []);

  const removeItem = useCallback<WardrobeContextValue['removeItem']>((id) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) deleteImageSafe(target.imageUri);
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const clearAll = useCallback<WardrobeContextValue['clearAll']>(() => {
    items.forEach((i) => deleteImageSafe(i.imageUri));
    setItems([]);
    setSavedOutfits([]);
  }, [items]);

  const markOutfitWorn = useCallback<WardrobeContextValue['markOutfitWorn']>((outfit) => {
    const ids = outfitPieces(outfit).map((i) => i.id);
    const now = Date.now();
    setItems((prev) =>
      prev.map((i) =>
        ids.includes(i.id)
          ? { ...i, wearCount: i.wearCount + 1, lastWornAt: now }
          : i,
      ),
    );
  }, []);

  const saveOutfit = useCallback<WardrobeContextValue['saveOutfit']>((outfit, meta) => {
    const saved: SavedOutfit = {
      id: newId(),
      itemIds: outfitPieces(outfit).map((i) => i.id),
      createdAt: Date.now(),
      note: meta?.note,
      occasions: meta?.occasions,
      seasons: meta?.seasons,
    };
    setSavedOutfits((prev) => [saved, ...prev]);
    return saved;
  }, []);

  const updateSavedOutfit = useCallback<WardrobeContextValue['updateSavedOutfit']>((id, patch) => {
    setSavedOutfits((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const removeSavedOutfit = useCallback<WardrobeContextValue['removeSavedOutfit']>((id) => {
    setSavedOutfits((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const addDailyLook = useCallback<WardrobeContextValue['addDailyLook']>((imageUri, note) => {
    const look: DailyLook = { id: newId(), imageUri, createdAt: Date.now(), note };
    setDailyLooks((prev) => [look, ...prev]);
  }, []);

  const removeDailyLook = useCallback<WardrobeContextValue['removeDailyLook']>((id) => {
    setDailyLooks((prev) => {
      const target = prev.find((d) => d.id === id);
      if (target) deleteImageSafe(target.imageUri);
      return prev.filter((d) => d.id !== id);
    });
  }, []);

  const setPlanLook = useCallback<WardrobeContextValue['setPlanLook']>((dateKey, savedId) => {
    setWeekPlan((prev) => {
      const next = { ...prev };
      if (savedId) next[dateKey] = savedId;
      else delete next[dateKey];
      return next;
    });
  }, []);

  return (
    <WardrobeContext.Provider
      value={{
        items,
        savedOutfits,
        dailyLooks,
        loading,
        addItem,
        addItems,
        updateItem,
        removeItem,
        clearAll,
        markOutfitWorn,
        saveOutfit,
        updateSavedOutfit,
        removeSavedOutfit,
        addDailyLook,
        removeDailyLook,
        weekPlan,
        setPlanLook,
      }}
    >
      {children}
    </WardrobeContext.Provider>
  );
}

export function useWardrobe(): WardrobeContextValue {
  const ctx = useContext(WardrobeContext);
  if (!ctx) throw new Error('useWardrobe deve ser usado dentro de WardrobeProvider');
  return ctx;
}
