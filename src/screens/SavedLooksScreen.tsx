// Tela "Salvos": looks criados/salvos, com filtro por ocasião e estação.

import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { theme } from '../theme';
import {
  CATEGORY_EMOJI,
  Category,
  ClothingItem,
  OCCASIONS,
  Occasion,
  Outfit,
  SEASONS,
  SavedOutfit,
  Season,
  outfitFromPieces,
  savedOccasions,
  savedSeasons,
} from '../types';
import { Chip, PrimaryButton } from '../components/ui';
import { ItemThumb } from '../components/ItemThumb';
import { PiecePicker } from '../components/PiecePicker';
import { AvatarTryOn } from '../components/AvatarTryOn';
import { useWardrobe } from '../store';

const CATEGORIES: Category[] = ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory'];

function resolveIds(s: SavedOutfit, items: ClothingItem[]): ClothingItem[] {
  const ids: string[] = Array.isArray(s.itemIds)
    ? s.itemIds
    : (Object.values(s.itemIds as any) as string[]);
  return ids
    .map((id) => items.find((i) => i.id === id))
    .filter((i): i is ClothingItem => !!i);
}

function occasionLabel(o?: Occasion): string | null {
  return OCCASIONS.find((x) => x.id === o)?.label ?? null;
}

function seasonInfo(s?: Season) {
  return SEASONS.find((x) => x.id === s) ?? null;
}

function formatDate(ts: number): string {
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(new Date(ts));
}

export function SavedLooksScreen({ onAdd }: { onAdd: () => void }) {
  const { items, savedOutfits, removeSavedOutfit, updateSavedOutfit } = useWardrobe();
  const [occ, setOcc] = useState<Occasion | 'all'>('all');
  const [season, setSeason] = useState<Season | 'all'>('all');

  // editor de classificação (multi-seleção)
  const [editing, setEditing] = useState<SavedOutfit | null>(null);
  const [editOccs, setEditOccs] = useState<Occasion[]>([]);
  const [editSeasons, setEditSeasons] = useState<Season[]>([]);
  const [editNote, setEditNote] = useState('');
  const [editPieces, setEditPieces] = useState<ClothingItem[]>([]);
  const [addCategory, setAddCategory] = useState<Category | null>(null);
  const [tryOnOutfit, setTryOnOutfit] = useState<Outfit | null>(null);

  function openEditor(s: SavedOutfit) {
    setEditing(s);
    setEditOccs(savedOccasions(s));
    setEditSeasons(savedSeasons(s));
    setEditNote(s.note ?? '');
    setEditPieces(resolveIds(s, items));
  }

  function removePiece(id: string) {
    setEditPieces((prev) => prev.filter((p) => p.id !== id));
  }

  function addPiece(item: ClothingItem | null) {
    if (item) setEditPieces((prev) => [...prev, item]);
    setAddCategory(null);
  }

  function toggleEditOcc(o: Occasion) {
    setEditOccs((cur) => (cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o]));
  }

  function toggleEditSeason(s: Season) {
    setEditSeasons((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  function saveEditor() {
    if (!editing) return;
    updateSavedOutfit(editing.id, {
      itemIds: editPieces.map((p) => p.id),
      occasions: editOccs,
      seasons: editSeasons,
      note: editNote.trim() || undefined,
      // limpa o legado de valor único
      occasion: undefined,
      season: undefined,
    });
    setEditing(null);
  }

  const filtered = useMemo(
    () =>
      savedOutfits.filter(
        (s) =>
          (occ === 'all' || savedOccasions(s).includes(occ)) &&
          (season === 'all' || savedSeasons(s).includes(season)),
      ),
    [savedOutfits, occ, season],
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ paddingBottom: 110 }}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Looks salvos</Text>
            <Text style={styles.subtitle}>
              {savedOutfits.length} no total · {filtered.length} no filtro atual
            </Text>

            <Text style={styles.filterLabel}>Ocasião</Text>
            <View style={styles.filterRow}>
              <Chip label="Tudo" active={occ === 'all'} onPress={() => setOcc('all')} />
              {OCCASIONS.map((o) => (
                <Chip
                  key={o.id}
                  label={o.label}
                  active={occ === o.id}
                  onPress={() => setOcc(o.id)}
                />
              ))}
            </View>

            <Text style={styles.filterLabel}>Estação</Text>
            <View style={styles.filterRow}>
              <Chip label="Tudo" active={season === 'all'} onPress={() => setSeason('all')} />
              {SEASONS.map((s) => (
                <Chip
                  key={s.id}
                  label={`${s.emoji} ${s.label}`}
                  active={season === s.id}
                  onPress={() => setSeason(s.id)}
                />
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>❤️</Text>
            <Text style={styles.emptyTitle}>
              {savedOutfits.length === 0 ? 'Nenhum look salvo ainda' : 'Nada com esse filtro'}
            </Text>
            <Text style={styles.emptyText}>
              {savedOutfits.length === 0
                ? 'Na tela Hoje ou no Sudoku, toque em ♡ Salvar para guardar seus looks aqui.'
                : 'Tente outra combinação de ocasião e estação.'}
            </Text>
            {savedOutfits.length === 0 && (
              <PrimaryButton label="+ Montar um look" onPress={onAdd} style={{ marginTop: 16 }} />
            )}
          </View>
        }
        renderItem={({ item }) => {
          const pieces = resolveIds(item, items);
          const occs = savedOccasions(item);
          const seas = savedSeasons(item);
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.badges}>
                  {occs.map((o) => (
                    <View key={`o-${o}`} style={styles.badgeOcc}>
                      <Text style={styles.badgeOccText}>{occasionLabel(o)}</Text>
                    </View>
                  ))}
                  {seas.map((s) => {
                    const info = seasonInfo(s);
                    return (
                      <View key={`s-${s}`} style={styles.badgeSeason}>
                        <Text style={styles.badgeSeasonText}>
                          {info?.emoji} {info?.label}
                        </Text>
                      </View>
                    );
                  })}
                  <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
                </View>
                <View style={styles.cardActions}>
                  <Pressable onPress={() => setTryOnOutfit(outfitFromPieces(pieces))} hitSlop={8}>
                    <Text style={styles.tryOn}>🪞 provar</Text>
                  </Pressable>
                  <Pressable onPress={() => openEditor(item)} hitSlop={8}>
                    <Text style={styles.edit}>✎ editar</Text>
                  </Pressable>
                  <Pressable onPress={() => removeSavedOutfit(item.id)} hitSlop={8}>
                    <Text style={styles.remove}>✕</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.thumbs}>
                {pieces.map((p) => (
                  <ItemThumb key={p.id} item={p} style={styles.thumb} rounded={theme.radius.sm} />
                ))}
              </View>

              {item.note ? <Text style={styles.note}>{item.note}</Text> : null}
            </View>
          );
        }}
      />

      <AvatarTryOn
        visible={!!tryOnOutfit}
        outfit={tryOnOutfit ?? {}}
        onClose={() => setTryOnOutfit(null)}
      />

      <Modal
        visible={!!editing}
        transparent
        animationType="slide"
        onRequestClose={() => setEditing(null)}
      >
        <Pressable style={styles.overlay} onPress={() => setEditing(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Editar look</Text>

            <Text style={styles.sheetLabel}>Peças (toque para remover)</Text>
            <View style={styles.piecesRow}>
              {editPieces.map((p) => (
                <Pressable key={p.id} onPress={() => removePiece(p.id)} style={styles.pieceWrap}>
                  <ItemThumb item={p} style={styles.pieceThumb} rounded={theme.radius.sm} />
                  <View style={styles.pieceRemove}>
                    <Text style={styles.pieceRemoveText}>✕</Text>
                  </View>
                </Pressable>
              ))}
            </View>
            <Text style={styles.addPieceHint}>Adicionar peça:</Text>
            <View style={styles.sheetRow}>
              {CATEGORIES.map((c) => (
                <Pressable key={c} style={styles.catBtn} onPress={() => setAddCategory(c)}>
                  <Text style={styles.catBtnText}>{CATEGORY_EMOJI[c]} +</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sheetLabel}>Ocasiões (toque para marcar várias)</Text>
            <View style={styles.sheetRow}>
              {OCCASIONS.map((o) => (
                <Chip
                  key={o.id}
                  label={o.label}
                  active={editOccs.includes(o.id)}
                  onPress={() => toggleEditOcc(o.id)}
                />
              ))}
            </View>

            <Text style={styles.sheetLabel}>Estações (toque para marcar várias)</Text>
            <View style={styles.sheetRow}>
              {SEASONS.map((s) => (
                <Chip
                  key={s.id}
                  label={`${s.emoji} ${s.label}`}
                  active={editSeasons.includes(s.id)}
                  onPress={() => toggleEditSeason(s.id)}
                />
              ))}
            </View>

            <Text style={styles.sheetLabel}>Nota</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Ex: look favorito do inverno"
              placeholderTextColor={theme.colors.muted}
              value={editNote}
              onChangeText={setEditNote}
            />

            <View style={styles.sheetBtns}>
              <PrimaryButton
                label="Cancelar"
                variant="outline"
                onPress={() => setEditing(null)}
                style={{ flex: 1 }}
              />
              <PrimaryButton label="Salvar" onPress={saveEditor} style={{ flex: 1 }} />
            </View>
            <Text style={styles.sheetHint}>Toque numa tag ativa para remover a classificação.</Text>
          </Pressable>
        </Pressable>
      </Modal>

      {addCategory && (
        <PiecePicker
          visible
          category={addCategory}
          items={items}
          allowRemove={false}
          onSelect={addPiece}
          onClose={() => setAddCategory(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 8 },
  title: { fontSize: theme.font.title, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 13, color: theme.colors.muted, marginTop: 4 },
  filterLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 18,
    marginBottom: 10,
  },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: {
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 14,
    ...theme.shadow.card,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 },
  badgeOcc: {
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeOccText: { fontSize: 12, color: theme.colors.accent, fontWeight: '700' },
  badgeSeason: {
    backgroundColor: theme.colors.accent2Soft,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeSeasonText: { fontSize: 12, color: theme.colors.accent2, fontWeight: '700' },
  cardDate: { fontSize: 12, color: theme.colors.muted },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  tryOn: { fontSize: 13, color: theme.colors.accent2, fontWeight: '700' },
  edit: { fontSize: 13, color: theme.colors.accent, fontWeight: '700' },
  remove: { fontSize: 16, color: theme.colors.muted, paddingHorizontal: 4 },
  overlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.bg,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    padding: 20,
    paddingBottom: 28,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginBottom: 6 },
  sheetLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 10,
  },
  sheetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  piecesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pieceWrap: { position: 'relative' },
  pieceThumb: { width: 50, height: 64 },
  pieceRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieceRemoveText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  addPieceHint: { fontSize: 12, color: theme.colors.muted, marginTop: 12, marginBottom: 8 },
  catBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  catBtnText: { fontSize: 13, color: theme.colors.text, fontWeight: '600' },
  noteInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.text,
  },
  sheetBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  sheetHint: { fontSize: 12, color: theme.colors.muted, textAlign: 'center', marginTop: 12 },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 56, height: 72 },
  note: { fontSize: 13, color: theme.colors.muted, marginTop: 10, lineHeight: 18 },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8, marginTop: 16 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  emptyText: { fontSize: 14, color: theme.colors.muted, textAlign: 'center', lineHeight: 20 },
});
