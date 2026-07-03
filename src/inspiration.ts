// Inspiração de looks: monta buscas de "looks completos" no Pinterest e no
// Google Imagens a partir das peças do guarda-roupa + ocasião + estação.
//
// Por que buscas (e não fotos embutidas)? Pinterest/Google não permitem
// raspar e redistribuir imagens de terceiros. Abrir a busca no navegador é
// legítimo (é o que a pessoa faria manualmente) e gratuito. As queries são
// montadas a partir do que VOCÊ tem, então a inspiração já vem filtrada.

import { CATEGORY_LABELS, COLORS, ClothingItem, Occasion, OCCASIONS } from './types';

const CATEGORY_EN: Record<ClothingItem['category'], string> = {
  top: 'top',
  bottom: 'trousers',
  dress: 'dress',
  outerwear: 'jacket',
  shoes: 'shoes',
  accessory: 'bag',
};

const OCCASION_EN: Record<Occasion, string> = {
  casual: 'casual',
  trabalho: 'workwear',
  esporte: 'sporty',
  formal: 'formal',
};

export function colorLabel(colorId: string): string {
  return COLORS.find((c) => c.id === colorId)?.label ?? '';
}

// Estação no hemisfério sul (Brasil) a partir do mês atual.
export function currentSeasonBR(date = new Date()): string {
  const m = date.getMonth(); // 0 = jan
  if (m === 11 || m <= 1) return 'verão';
  if (m >= 2 && m <= 4) return 'outono';
  if (m >= 5 && m <= 7) return 'inverno';
  return 'primavera';
}

export interface InspoQuery {
  title: string;
  subtitle: string;
  query: string;
}

// Monta uma lista de buscas relevantes. Se houver peça-base, as buscas giram
// em torno dela; sempre inclui buscas gerais por ocasião/estação.
export function buildQueries(
  base: ClothingItem | null,
  occasion: Occasion,
  season = currentSeasonBR(),
): InspoQuery[] {
  const occLabel = (OCCASIONS.find((o) => o.id === occasion)?.label ?? 'Casual').toLowerCase();
  const list: InspoQuery[] = [];

  if (base) {
    const cat = CATEGORY_LABELS[base.category].toLowerCase();
    const color = colorLabel(base.colorId).toLowerCase();
    const piece = `${cat} ${color}`.trim();

    list.push({
      title: `Looks ${occLabel} com sua ${cat}`,
      subtitle: `combinações com a peça "${base.name}"`,
      query: `look ${occLabel} com ${piece}`,
    });
    list.push({
      title: `Como usar ${piece}`,
      subtitle: 'várias formas de combinar essa peça',
      query: `como usar ${piece}`,
    });
    list.push({
      title: 'Inspiração internacional',
      subtitle: 'resultados em inglês (mais variedade)',
      query: `${color} ${CATEGORY_EN[base.category]} ${OCCASION_EN[occasion]} outfit`,
    });
  }

  list.push({
    title: `Looks de ${occLabel} para o ${season}`,
    subtitle: 'ideias da estação atual',
    query: `looks ${occLabel} ${season} feminino`,
  });
  list.push({
    title: 'Guarda-roupa cápsula',
    subtitle: 'montar muitos looks com poucas peças',
    query: `capsule wardrobe ${OCCASION_EN[occasion]} outfits`,
  });

  return list;
}

export function pinterestUrl(query: string): string {
  return `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`;
}

export function googleImagesUrl(query: string): string {
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
}
