// Tela "Sudoku": técnica 3×3×3 → 9 peças que geram até 27 looks.

import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { theme } from '../theme';
import { CATEGORY_LABELS, Category, ClothingItem, Outfit, currentSeasonBR } from '../types';
import { ItemThumb } from '../components/ItemThumb';
import { PiecePicker } from '../components/PiecePicker';
import { PrimaryButton } from '../components/ui';
import { useWardrobe } from '../store';
import {
  SudokuGrid,
  SudokuLook,
  SudokuRow,
  buildSudoku,
  generateLooks,
  sudokuStats,
} from '../sudoku';

type ExtraSlot = 'shoes' | 'accessory';

const ROWS: { key: SudokuRow; label: string }[] = [
  { key: 'tops', label: 'Partes de cima' },
  { key: 'bottoms', label: 'Partes de baixo' },
  { key: 'thirds', label: '3ª peça (camada)' },
];

const ROW_CATEGORY: Record<SudokuRow, Category> = {
  tops: 'top',
  bottoms: 'bottom',
  thirds: 'outerwear',
};

export function SudokuScreen({ onAdd }: { onAdd: () => void }) {
  const { items, saveOutfit } = useWardrobe();
  const [grid, setGrid] = useState<SudokuGrid | null>(null);
  const [showLooks, setShowLooks] = useState(false);
  const [pickerCell, setPickerCell] = useState<{ row: SudokuRow; index: number } | null>(null);
  // calçado/acessório adicionados por look (índice → peças extras)
  const [extras, setExtras] = useState<Record<number, Partial<Record<ExtraSlot, ClothingItem>>>>({});
  const [pickerLook, setPickerLook] = useState<{ index: number; slot: ExtraSlot } | null>(null);

  // ao mudar a grade, os looks são regerados → limpa os extras
  useEffect(() => {
    setExtras({});
  }, [grid]);

  useEffect(() => {
    if (items.length > 0) setGrid(buildSudoku(items));
    else setGrid(null);
  }, [items]);

  const looks = useMemo(() => (grid ? generateLooks(grid) : []), [grid]);
  const stats = useMemo(() => (grid ? sudokuStats(grid) : null), [grid]);

  const tops = items.filter((i) => i.category === 'top');
  const bottoms = items.filter((i) => i.category === 'bottom');

  function regenerate() {
    if (items.length > 0) {
      setGrid(buildSudoku(items, true));
      setShowLooks(false);
    }
  }

  // Escolha manual de uma peça para a célula tocada.
  function handlePick(item: ClothingItem | null) {
    if (!grid || !pickerCell) {
      setPickerCell(null);
      return;
    }
    const { row, index } = pickerCell;
    if (row === 'thirds') {
      const next = [...grid.thirds];
      while (next.length < 3) next.push(null);
      next[index] = item;
      setGrid({ ...grid, thirds: next.slice(0, 3) });
    } else {
      const arr: (ClothingItem | null)[] = [
        grid[row][0] ?? null,
        grid[row][1] ?? null,
        grid[row][2] ?? null,
      ];
      arr[index] = item;
      const compact = arr.filter((x): x is ClothingItem => !!x);
      setGrid({ ...grid, [row]: compact });
    }
    setShowLooks(false);
    setPickerCell(null);
  }

  // ids já usados na linha (evita escolher a mesma peça duas vezes)
  function rowExclude(row: SudokuRow): Set<string> {
    if (!grid) return new Set();
    return new Set(grid[row].filter(Boolean).map((i) => (i as ClothingItem).id));
  }

  // look final = peças da grade + calçado/acessório extras escolhidos
  function lookOutfit(l: SudokuLook): Outfit {
    const ex = extras[l.index] || {};
    const o: Outfit = { ...l.outfit };
    if (ex.shoes) o.shoes = ex.shoes;
    if (ex.accessory) o.accessory = ex.accessory;
    return o;
  }

  function handlePickLook(item: ClothingItem | null) {
    if (!pickerLook) {
      setPickerLook(null);
      return;
    }
    const { index, slot } = pickerLook;
    setExtras((prev) => {
      const cur = { ...(prev[index] || {}) };
      if (item) cur[slot] = item;
      else delete cur[slot];
      return { ...prev, [index]: cur };
    });
    setPickerLook(null);
  }

  // Falta o mínimo para a técnica funcionar?
  const notEnough = tops.length === 0 || bottoms.length === 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Look Sudoku</Text>
        <Text style={styles.subtitle}>
          A técnica 3×3×3: 3 cima + 3 baixo + 3 camadas, onde tudo combina com tudo.
          9 peças, até 27 looks.
        </Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🧩</Text>
          <Text style={styles.emptyTitle}>Monte sua cápsula</Text>
          <Text style={styles.emptyText}>
            Cadastre suas roupas para o app montar a grade Sudoku e multiplicar seus looks.
          </Text>
          <PrimaryButton label="+ Adicionar peças" onPress={onAdd} style={{ marginTop: 16 }} />
        </View>
      ) : (
        <>
          {/* Estatística de compatibilidade */}
          {stats && (
            <View style={styles.statBar}>
              <Text style={styles.statText}>
                {stats.pieceCount} peças · {stats.neutralCount} neutras ·{' '}
                <Text style={{ color: theme.colors.accent, fontWeight: '700' }}>
                  {stats.total} looks
                </Text>
              </Text>
              <Pressable onPress={regenerate} hitSlop={8}>
                <Text style={styles.regen}>🎲 Gerar de novo</Text>
              </Pressable>
            </View>
          )}

          {notEnough && (
            <Text style={styles.warn}>
              Para gerar looks você precisa de pelo menos 1 parte de cima e 1 de baixo.
            </Text>
          )}

          {/* Grade 3×3 */}
          {grid &&
            ROWS.map((r) => {
              const cells = grid[r.key];
              return (
                <View key={r.key} style={styles.rowBlock}>
                  <Text style={styles.rowLabel}>{r.label}</Text>
                  <View style={styles.row}>
                    {[0, 1, 2].map((idx) => {
                      const item = (cells[idx] ?? null) as ClothingItem | null;
                      return (
                        <Pressable
                          key={idx}
                          style={styles.cell}
                          onPress={() => setPickerCell({ row: r.key, index: idx })}
                        >
                          {item ? (
                            <>
                              <ItemThumb item={item} style={styles.cellImg} />
                              <Text style={styles.cellName} numberOfLines={1}>
                                {item.name}
                              </Text>
                            </>
                          ) : (
                            <View style={[styles.cellImg, styles.cellEmpty]}>
                              <Text style={styles.cellEmptyText}>
                                {r.key === 'thirds' ? 'sem 3ª' : '—'}
                              </Text>
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}

          <Text style={styles.hint}>
            Toque numa célula para escolher a peça · 🎲 monta automático.
          </Text>

          <PrimaryButton
            label={showLooks ? 'Esconder os looks' : `Ver os ${looks.length} looks`}
            onPress={() => setShowLooks((v) => !v)}
            style={{ marginHorizontal: 20, marginTop: 8 }}
          />

          {/* Galeria dos looks */}
          {showLooks && (
            <View style={styles.looks}>
              {looks.map((l) => {
                const o = lookOutfit(l);
                return (
                  <LookCard
                    key={l.index}
                    index={l.index}
                    outfit={o}
                    onPickShoes={() => setPickerLook({ index: l.index, slot: 'shoes' })}
                    onPickAccessory={() => setPickerLook({ index: l.index, slot: 'accessory' })}
                    onSave={() => saveOutfit(o, { seasons: [currentSeasonBR()] })}
                  />
                );
              })}
            </View>
          )}
        </>
      )}

      {pickerCell && (
        <PiecePicker
          visible
          category={ROW_CATEGORY[pickerCell.row]}
          items={items}
          selectedId={(grid?.[pickerCell.row][pickerCell.index] ?? undefined)?.id}
          excludeIds={rowExclude(pickerCell.row)}
          onSelect={handlePick}
          onClose={() => setPickerCell(null)}
        />
      )}

      {pickerLook && (
        <PiecePicker
          visible
          category={pickerLook.slot}
          items={items}
          selectedId={extras[pickerLook.index]?.[pickerLook.slot]?.id}
          onSelect={handlePickLook}
          onClose={() => setPickerLook(null)}
        />
      )}
    </ScrollView>
  );
}

function LookCard({
  index,
  outfit,
  onPickShoes,
  onPickAccessory,
  onSave,
}: {
  index: number;
  outfit: Outfit;
  onPickShoes: () => void;
  onPickAccessory: () => void;
  onSave: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const base = [outfit.top, outfit.bottom, outfit.outerwear].filter(Boolean) as ClothingItem[];
  return (
    <View style={styles.lookCard}>
      <View style={styles.lookTop}>
        <Text style={styles.lookNum}>#{index}</Text>
        <Pressable
          onPress={() => {
            if (!saved) {
              onSave();
              setSaved(true);
            }
          }}
          hitSlop={8}
        >
          <Text style={styles.lookSaveText}>{saved ? '❤️' : '♡'}</Text>
        </Pressable>
      </View>

      <View style={styles.lookThumbs}>
        {base.map((p) => (
          <ItemThumb key={p.id} item={p} style={styles.lookThumb} rounded={theme.radius.sm} />
        ))}

        {/* Calçado (editável) */}
        <Pressable onPress={onPickShoes}>
          {outfit.shoes ? (
            <ItemThumb item={outfit.shoes} style={styles.lookThumb} rounded={theme.radius.sm} />
          ) : (
            <View style={[styles.lookThumb, styles.addExtra]}>
              <Text style={styles.addExtraText}>👟＋</Text>
            </View>
          )}
        </Pressable>

        {/* Acessório (editável) */}
        <Pressable onPress={onPickAccessory}>
          {outfit.accessory ? (
            <ItemThumb item={outfit.accessory} style={styles.lookThumb} rounded={theme.radius.sm} />
          ) : (
            <View style={[styles.lookThumb, styles.addExtra]}>
              <Text style={styles.addExtraText}>👜＋</Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 8 },
  title: { fontSize: theme.font.title, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.muted, marginTop: 6, lineHeight: 20 },
  statBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 18,
    marginBottom: 6,
  },
  statText: { fontSize: 14, color: theme.colors.text },
  regen: { fontSize: 14, color: theme.colors.accent2, fontWeight: '700' },
  warn: {
    marginHorizontal: 20,
    marginVertical: 8,
    fontSize: 13,
    color: theme.colors.danger,
  },
  rowBlock: { paddingHorizontal: 20, marginTop: 14 },
  rowLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.accent,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  row: { flexDirection: 'row', gap: 10 },
  cell: { flex: 1 },
  cellImg: { height: 96, borderRadius: theme.radius.md },
  cellName: { fontSize: 11, color: theme.colors.text, marginTop: 4 },
  cellEmpty: {
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellEmptyText: { fontSize: 12, color: theme.colors.muted },
  hint: {
    fontSize: 12,
    color: theme.colors.muted,
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 6,
  },
  looks: { paddingHorizontal: 20, marginTop: 16, gap: 10 },
  lookCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 12,
    ...theme.shadow.card,
  },
  lookTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  lookNum: { fontSize: 13, fontWeight: '700', color: theme.colors.muted },
  lookThumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  lookThumb: { width: 50, height: 64 },
  addExtra: {
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addExtraText: { fontSize: 16, color: theme.colors.muted },
  lookSaveText: { fontSize: 22, color: theme.colors.accent },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8, marginTop: 30 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  emptyText: { fontSize: 14, color: theme.colors.muted, textAlign: 'center', lineHeight: 20 },
});
