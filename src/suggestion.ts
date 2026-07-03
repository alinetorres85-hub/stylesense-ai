// Motor de sugestão de looks (MVP, baseado em regras).
//
// Considera: clima (temperatura/chuva), ocasião (formalidade alvo),
// variedade (peças menos usadas recentemente) e harmonia simples de cor.
// O resultado é determinístico para um mesmo "seed", o que permite o botão
// "trocar" gerar variações estáveis.

import { COLORS, ClothingItem, Category, Occasion, OCCASIONS, Outfit, OutfitSlot } from './types';
import { Weather } from './weather';

export interface SuggestionContext {
  weather: Weather;
  occasion: Occasion;
  seed: number; // muda a cada "trocar" para gerar variações
}

// Faixa de "agasalho" alvo a partir da sensação térmica.
function targetWarmth(feelsLikeC: number): number {
  if (feelsLikeC >= 28) return 1;
  if (feelsLikeC >= 23) return 2;
  if (feelsLikeC >= 17) return 3;
  if (feelsLikeC >= 10) return 4;
  return 5;
}

function colorIsNeutral(colorId: string): boolean {
  return COLORS.find((c) => c.id === colorId)?.neutral ?? false;
}

// Gerador pseudoaleatório determinístico simples (mulberry32).
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Scored {
  item: ClothingItem;
  score: number;
}

// Pontua quão bem uma peça atende ao contexto.
function scoreItem(
  item: ClothingItem,
  ctx: SuggestionContext,
  warmthGoal: number,
  formalityGoal: number,
  baseColorId: string | null,
  random: () => number,
): number {
  let score = 100;

  // proximidade de agasalho e formalidade (quanto mais perto, melhor)
  score -= Math.abs(item.warmth - warmthGoal) * 14;
  score -= Math.abs(item.formality - formalityGoal) * 12;

  // chuva: prioriza peças à prova d'água
  if (ctx.weather.isRain && item.rainproof) score += 18;
  if (ctx.weather.isRain && !item.rainproof && item.category === 'shoes') score -= 12;

  // variedade: penaliza peças usadas recentemente / muito usadas
  if (item.lastWornAt) {
    const days = (Date.now() - item.lastWornAt) / (1000 * 60 * 60 * 24);
    if (days < 1) score -= 30;
    else if (days < 3) score -= 15;
    else if (days < 7) score -= 6;
  }
  score -= Math.min(item.wearCount, 10) * 1.5;

  // harmonia de cor: peças neutras combinam com tudo; se já há uma cor
  // forte de base, preferir neutros para o restante.
  if (baseColorId && baseColorId !== item.colorId) {
    const baseNeutral = colorIsNeutral(baseColorId);
    const itemNeutral = colorIsNeutral(item.colorId);
    if (!baseNeutral && !itemNeutral) score -= 16; // duas cores fortes brigando
    if (itemNeutral) score += 6;
  }

  // um empurrãozinho aleatório (estável por seed) para gerar variedade
  score += random() * 22;

  return score;
}

function pickBest(
  candidates: ClothingItem[],
  ctx: SuggestionContext,
  warmthGoal: number,
  formalityGoal: number,
  baseColorId: string | null,
  random: () => number,
  excludeIds: Set<string>,
): ClothingItem | undefined {
  const pool = candidates.filter((c) => !excludeIds.has(c.id));
  if (!pool.length) return undefined;
  const scored: Scored[] = pool.map((item) => ({
    item,
    score: scoreItem(item, ctx, warmthGoal, formalityGoal, baseColorId, random),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0].item;
}

function byCategory(items: ClothingItem[], cat: Category): ClothingItem[] {
  return items.filter((i) => i.category === cat);
}

export interface SuggestionResult {
  outfit: Outfit;
  warmthGoal: number;
  formalityGoal: number;
  needsOuterwear: boolean;
  notes: string[];
}

export function suggestOutfit(
  items: ClothingItem[],
  ctx: SuggestionContext,
): SuggestionResult {
  const random = rng(ctx.seed + Math.round(ctx.weather.feelsLikeC) + ctx.occasion.length);
  const warmthGoal = targetWarmth(ctx.weather.feelsLikeC);
  const formalityGoal =
    OCCASIONS.find((o) => o.id === ctx.occasion)?.targetFormality ?? 3;
  const needsOuterwear = ctx.weather.feelsLikeC < 17 || ctx.weather.isRain;

  const outfit: Outfit = {};
  const used = new Set<string>();
  const notes: string[] = [];

  // Decide entre vestido (peça única) ou cima+baixo.
  const dresses = byCategory(items, 'dress');
  const tops = byCategory(items, 'top');
  const bottoms = byCategory(items, 'bottom');

  const useDress =
    dresses.length > 0 &&
    // só considera vestido se calor permitir e ocasião não for esporte
    warmthGoal <= 3 &&
    ctx.occasion !== 'esporte' &&
    // alterna por seed entre vestido e conjunto quando ambos existem
    (tops.length === 0 || bottoms.length === 0 || random() > 0.55);

  let baseColorId: string | null = null;

  if (useDress) {
    const dress = pickBest(dresses, ctx, warmthGoal, formalityGoal, null, random, used);
    if (dress) {
      outfit.dress = dress;
      used.add(dress.id);
      baseColorId = dress.colorId;
    }
  } else {
    const top = pickBest(tops, ctx, warmthGoal, formalityGoal, null, random, used);
    if (top) {
      outfit.top = top;
      used.add(top.id);
      baseColorId = top.colorId;
    }
    const bottom = pickBest(bottoms, ctx, warmthGoal, formalityGoal, baseColorId, random, used);
    if (bottom) {
      outfit.bottom = bottom;
      used.add(bottom.id);
      if (!baseColorId) baseColorId = bottom.colorId;
    }
  }

  // Calçado
  const shoes = pickBest(byCategory(items, 'shoes'), ctx, warmthGoal, formalityGoal, baseColorId, random, used);
  if (shoes) {
    outfit.shoes = shoes;
    used.add(shoes.id);
  }

  // Casaco quando frio/chuva
  if (needsOuterwear) {
    const outer = pickBest(
      byCategory(items, 'outerwear'),
      ctx,
      Math.max(warmthGoal, 3),
      formalityGoal,
      baseColorId,
      random,
      used,
    );
    if (outer) {
      outfit.outerwear = outer;
      used.add(outer.id);
    } else {
      notes.push('Está frio/chuvoso e você não tem um casaco compatível cadastrado.');
    }
  }

  // Acessório (opcional, só às vezes para não poluir)
  if (random() > 0.4) {
    const acc = pickBest(byCategory(items, 'accessory'), ctx, warmthGoal, formalityGoal, baseColorId, random, used);
    if (acc) {
      outfit.accessory = acc;
      used.add(acc.id);
    }
  }

  // Notas explicativas
  if (ctx.weather.isRain) notes.push('Previsão de chuva — priorizei peças mais protegidas.');
  if (warmthGoal >= 4) notes.push('Frio: sugeri camadas mais quentes.');
  if (warmthGoal <= 1) notes.push('Calor: peças leves e arejadas.');

  return { outfit, warmthGoal, formalityGoal, needsOuterwear, notes };
}

// Troca uma única peça do look mantendo o restante.
export function swapSlot(
  current: Outfit,
  slot: OutfitSlot,
  items: ClothingItem[],
  ctx: SuggestionContext,
): ClothingItem | undefined {
  const random = rng(ctx.seed + slot.length * 7 + ctx.weather.tempC);
  const warmthGoal = targetWarmth(ctx.weather.feelsLikeC);
  const formalityGoal = OCCASIONS.find((o) => o.id === ctx.occasion)?.targetFormality ?? 3;

  const slotCategory: Record<OutfitSlot, Category> = {
    top: 'top',
    bottom: 'bottom',
    dress: 'dress',
    outerwear: 'outerwear',
    shoes: 'shoes',
    accessory: 'accessory',
  };

  const used = new Set<string>(
    Object.values(current)
      .filter(Boolean)
      .map((i) => (i as ClothingItem).id),
  );

  const candidates = byCategory(items, slotCategory[slot]);
  // remove o atual da exclusão para permitir realmente trocar
  const currentItem = current[slot];
  if (currentItem) used.delete(currentItem.id);
  // mas evita repetir o atual
  if (currentItem) used.add(currentItem.id);

  const baseColorId =
    current.dress?.colorId ?? current.top?.colorId ?? current.bottom?.colorId ?? null;

  return pickBest(candidates, ctx, warmthGoal, formalityGoal, baseColorId, random, used);
}
