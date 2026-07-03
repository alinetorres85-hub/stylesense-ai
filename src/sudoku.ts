// Técnica Sudoku (Sudoku Packing Method): grade 3×3×3.
// 3 partes de cima + 3 partes de baixo + 3 terceiras peças (camadas), onde
// toda peça combina com todas as outras → 3×3×3 = 27 looks.
//
// A seleção prioriza NEUTROS (para tudo combinar entre si) e variedade de
// formalidade, evitando duas cores fortes "brigando" no mesmo conjunto.

import { COLORS, ClothingItem, Category, Outfit } from './types';

export interface SudokuGrid {
  tops: ClothingItem[]; // até 3
  bottoms: ClothingItem[]; // até 3
  thirds: (ClothingItem | null)[]; // até 3; null = "sem 3ª peça"
}

export interface SudokuLook {
  index: number;
  outfit: Outfit;
}

function isNeutral(colorId: string): boolean {
  return COLORS.find((c) => c.id === colorId)?.neutral ?? false;
}

function byCategory(items: ClothingItem[], cat: Category): ClothingItem[] {
  return items.filter((i) => i.category === cat);
}

// Pontua a "aptidão sudoku" de uma peça: neutros combinam com tudo (peso alto),
// peças usadas há mais tempo entram com leve preferência (renovar a cápsula).
function fitness(item: ClothingItem): number {
  let s = 0;
  if (isNeutral(item.colorId)) s += 30;
  if (item.lastWornAt) {
    const days = (Date.now() - item.lastWornAt) / (1000 * 60 * 60 * 24);
    s += Math.min(days, 14); // até +14
  } else {
    s += 8;
  }
  s -= Math.min(item.wearCount, 10);
  return s;
}

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Escolhe até 3 peças de uma categoria maximizando aptidão e variando a
// formalidade (para os looks não ficarem todos com a mesma "pegada").
function pickThree(pool: ClothingItem[], shuffle = false): ClothingItem[] {
  if (pool.length <= 3) return [...pool];
  const base = shuffle ? shuffled(pool) : pool;
  const sorted = [...base].sort((a, b) => fitness(b) - fitness(a));
  const chosen: ClothingItem[] = [];
  const usedFormality = new Set<number>();
  // 1ª passada: pega variando formalidade
  for (const it of sorted) {
    if (chosen.length >= 3) break;
    if (!usedFormality.has(it.formality)) {
      chosen.push(it);
      usedFormality.add(it.formality);
    }
  }
  // 2ª passada: completa com os melhores restantes
  for (const it of sorted) {
    if (chosen.length >= 3) break;
    if (!chosen.includes(it)) chosen.push(it);
  }
  return chosen.slice(0, 3);
}

export function buildSudoku(items: ClothingItem[], shuffle = false): SudokuGrid {
  const tops = pickThree(byCategory(items, 'top'), shuffle);
  const bottoms = pickThree(byCategory(items, 'bottom'), shuffle);
  const thirdsReal = pickThree(byCategory(items, 'outerwear'), shuffle);

  // Garante 3 colunas de terceira peça; preenche com "sem 3ª peça" (null).
  const thirds: (ClothingItem | null)[] = [...thirdsReal];
  while (thirds.length < 3) thirds.push(null);

  return { tops, bottoms, thirds: thirds.slice(0, 3) };
}

// Gera todos os looks (produto cartesiano) — clássico 27 quando 3×3×3.
export function generateLooks(grid: SudokuGrid): SudokuLook[] {
  const looks: SudokuLook[] = [];
  let i = 1;
  for (const top of grid.tops) {
    for (const bottom of grid.bottoms) {
      for (const third of grid.thirds) {
        const outfit: Outfit = { top, bottom };
        if (third) outfit.outerwear = third;
        looks.push({ index: i++, outfit });
      }
    }
  }
  return looks;
}

export type SudokuRow = 'tops' | 'bottoms' | 'thirds';

// Troca a peça de um slot da grade pelo próximo candidato disponível da mesma
// categoria que ainda não está na grade (cicla entre as opções).
export function swapCell(
  grid: SudokuGrid,
  row: SudokuRow,
  index: number,
  items: ClothingItem[],
): SudokuGrid {
  const category: Category = row === 'tops' ? 'top' : row === 'bottoms' ? 'bottom' : 'outerwear';
  const pool = byCategory(items, category);

  const current = grid[row][index];
  const usedIds = new Set(
    grid[row].filter(Boolean).map((it) => (it as ClothingItem).id),
  );

  // candidatos que não estão na linha (exceto o atual, que queremos substituir)
  const candidates = pool.filter((it) => !usedIds.has(it.id));

  // permite também voltar para "sem 3ª peça" na linha de terceiras
  if (row === 'thirds') {
    const next: ClothingItem | null =
      candidates.length > 0 ? candidates.sort((a, b) => fitness(b) - fitness(a))[0] : null;
    // se já era null e não há candidato, mantém null
    const newThirds = [...grid.thirds];
    newThirds[index] = current ? next : (candidates[0] ?? null);
    return { ...grid, thirds: newThirds };
  }

  if (candidates.length === 0) return grid; // nada para trocar
  const next = candidates.sort((a, b) => fitness(b) - fitness(a))[0];
  const newRow = [...grid[row]] as ClothingItem[];
  newRow[index] = next;
  return { ...grid, [row]: newRow };
}

// Pequeno diagnóstico de compatibilidade para mostrar ao usuário.
export function sudokuStats(grid: SudokuGrid): {
  total: number;
  neutralCount: number;
  pieceCount: number;
  accentColors: string[];
} {
  const all: ClothingItem[] = [
    ...grid.tops,
    ...grid.bottoms,
    ...(grid.thirds.filter(Boolean) as ClothingItem[]),
  ];
  const neutralCount = all.filter((i) => isNeutral(i.colorId)).length;
  const accentColors = Array.from(
    new Set(all.filter((i) => !isNeutral(i.colorId)).map((i) => i.colorId)),
  );
  const total = grid.tops.length * grid.bottoms.length * grid.thirds.length;
  return { total, neutralCount, pieceCount: all.length, accentColors };
}
