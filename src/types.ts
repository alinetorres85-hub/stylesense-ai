// Modelo de dados central do StyleSense AI (MVP)

export type Category =
  | 'top' // parte de cima
  | 'bottom' // parte de baixo
  | 'dress' // vestido / peça única
  | 'outerwear' // casaco / camada externa
  | 'shoes' // calçado
  | 'accessory'; // acessório

export const CATEGORY_LABELS: Record<Category, string> = {
  top: 'Parte de cima',
  bottom: 'Parte de baixo',
  dress: 'Vestido',
  outerwear: 'Casaco',
  shoes: 'Calçado',
  accessory: 'Acessório',
};

export const CATEGORY_EMOJI: Record<Category, string> = {
  top: '👕',
  bottom: '👖',
  dress: '👗',
  outerwear: '🧥',
  shoes: '👟',
  accessory: '👜',
};

// Cores básicas usadas para harmonização simples
export interface ColorOption {
  id: string;
  label: string;
  hex: string;
  neutral: boolean; // neutros combinam com quase tudo
}

export const COLORS: ColorOption[] = [
  { id: 'preto', label: 'Preto', hex: '#1A1A1A', neutral: true },
  { id: 'branco', label: 'Branco', hex: '#F7F7F7', neutral: true },
  { id: 'cinza', label: 'Cinza', hex: '#9AA0A6', neutral: true },
  { id: 'bege', label: 'Bege', hex: '#D8C3A5', neutral: true },
  { id: 'marrom', label: 'Marrom', hex: '#7B5E45', neutral: true },
  { id: 'marinho', label: 'Marinho', hex: '#27374D', neutral: true },
  { id: 'azul', label: 'Azul', hex: '#3E7CB1', neutral: false },
  { id: 'verde', label: 'Verde', hex: '#4F7C5A', neutral: false },
  { id: 'vermelho', label: 'Vermelho', hex: '#B5452F', neutral: false },
  { id: 'rosa', label: 'Rosa', hex: '#D08AA0', neutral: false },
  { id: 'roxo', label: 'Roxo', hex: '#7B4FA0', neutral: false },
  { id: 'amarelo', label: 'Amarelo', hex: '#E0B044', neutral: false },
  { id: 'estampado', label: 'Estampado', hex: '#A77CC0', neutral: false },
];

// Tags sugeridas (chips selecionáveis); o usuário também pode criar as próprias.
export const SUGGESTED_TAGS: string[] = [
  'trabalho',
  'casual',
  'festa',
  'social',
  'esporte',
  'praia',
  'viagem',
  'inverno',
  'verão',
  'favorita',
  'conforto',
  'básico',
];

export interface ClothingItem {
  id: string;
  imageUri: string;
  category: Category;
  name: string;
  colorId: string;
  // warmth: 1 (muito leve) a 5 (muito quente)
  warmth: number;
  // formality: 1 (bem casual) a 5 (formal)
  formality: number;
  // true se a peça resiste/serve para chuva
  rainproof: boolean;
  tags: string[];
  createdAt: number;
  wearCount: number;
  lastWornAt?: number;
}

// Uma peça por "slot" de um look. `extraTops` permite camadas extras
// (ex.: regata + camisa + cardigã) ao montar o look à mão.
export interface Outfit {
  top?: ClothingItem;
  extraTops?: ClothingItem[];
  bottom?: ClothingItem;
  dress?: ClothingItem;
  outerwear?: ClothingItem;
  shoes?: ClothingItem;
  accessory?: ClothingItem;
}

// Slots de peça única (não inclui extraTops, que é uma lista).
export type OutfitSlot = 'top' | 'bottom' | 'dress' | 'outerwear' | 'shoes' | 'accessory';

// Monta um Outfit a partir de uma lista de peças (distribui por slot; tops
// extras viram camadas). Inverso prático de outfitPieces.
export function outfitFromPieces(pieces: ClothingItem[]): Outfit {
  const o: Outfit = {};
  for (const p of pieces) {
    switch (p.category) {
      case 'top':
        if (!o.top) o.top = p;
        else o.extraTops = [...(o.extraTops ?? []), p];
        break;
      case 'bottom':
        o.bottom = p;
        break;
      case 'dress':
        o.dress = p;
        break;
      case 'outerwear':
        o.outerwear = p;
        break;
      case 'shoes':
        o.shoes = p;
        break;
      case 'accessory':
        o.accessory = p;
        break;
    }
  }
  return o;
}

// Todas as peças de um look, em ordem, incluindo as camadas extras.
export function outfitPieces(o: Outfit): ClothingItem[] {
  const list: (ClothingItem | undefined)[] = [
    o.top,
    ...(o.extraTops ?? []),
    o.dress,
    o.bottom,
    o.outerwear,
    o.shoes,
    o.accessory,
  ];
  return list.filter((x): x is ClothingItem => !!x);
}

// Estações do ano (hemisfério sul / Brasil).
export type Season = 'verão' | 'outono' | 'inverno' | 'primavera';

export const SEASONS: { id: Season; label: string; emoji: string }[] = [
  { id: 'verão', label: 'Verão', emoji: '☀️' },
  { id: 'outono', label: 'Outono', emoji: '🍂' },
  { id: 'inverno', label: 'Inverno', emoji: '❄️' },
  { id: 'primavera', label: 'Primavera', emoji: '🌸' },
];

export function currentSeasonBR(date = new Date()): Season {
  const m = date.getMonth(); // 0 = jan
  if (m === 11 || m <= 1) return 'verão';
  if (m >= 2 && m <= 4) return 'outono';
  if (m >= 5 && m <= 7) return 'inverno';
  return 'primavera';
}

export interface SavedOutfit {
  id: string;
  itemIds: string[]; // lista plana de ids (suporta múltiplas camadas)
  createdAt: number;
  note?: string;
  occasions?: Occasion[];
  seasons?: Season[];
  // legado: dados antigos salvos com valor único
  season?: Season;
  occasion?: Occasion;
}

// Normaliza ocasiões/estações para lista (cobrindo os dados legados).
export function savedOccasions(s: SavedOutfit): Occasion[] {
  if (s.occasions && s.occasions.length) return s.occasions;
  return s.occasion ? [s.occasion] : [];
}

export function savedSeasons(s: SavedOutfit): Season[] {
  if (s.seasons && s.seasons.length) return s.seasons;
  return s.season ? [s.season] : [];
}

// Foto do look usado no dia (diário/OOTD).
export interface DailyLook {
  id: string;
  imageUri: string;
  createdAt: number;
  note?: string;
}

// Ocasião desejada para o look do dia
export type Occasion = 'casual' | 'trabalho' | 'esporte' | 'formal';

export const OCCASIONS: { id: Occasion; label: string; targetFormality: number }[] = [
  { id: 'casual', label: 'Casual', targetFormality: 2 },
  { id: 'trabalho', label: 'Trabalho', targetFormality: 4 },
  { id: 'esporte', label: 'Esporte', targetFormality: 1 },
  { id: 'formal', label: 'Formal', targetFormality: 5 },
];
