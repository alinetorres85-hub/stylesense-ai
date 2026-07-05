// Planejador da semana: para cada dia mostra a previsão do tempo e o look
// escolhido (de um look salvo). Colapsável, fica na tela Hoje.

import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import {
  CATEGORY_LABELS,
  ClothingItem,
  OCCASIONS,
  Occasion,
  Outfit,
  OutfitSlot,
  SEASONS,
  SavedOutfit,
  Season,
  currentSeasonBR,
  outfitPieces,
  savedOccasions,
  savedSeasons,
} from '../types';
import { DailyForecast } from '../weather';
import { ItemThumb } from './ItemThumb';
import { PiecePicker } from './PiecePicker';
import { Chip, PrimaryButton } from './ui';
import { useWardrobe } from '../store';

const BUILDER_SLOTS: OutfitSlot[] = ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory'];

// Reconstrói um Outfit (por slot) a partir de uma lista de peças. Camadas extras
// de "parte de cima" vão para extraTops (preservadas, mesmo sem edição visual aqui).
function outfitFromPieces(pieces: ClothingItem[]): Outfit {
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

function weekdayLabel(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(d);
}

function todayKey(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(
    t.getDate(),
  ).padStart(2, '0')}`;
}

function resolveIds(s: SavedOutfit, items: ClothingItem[]): ClothingItem[] {
  const ids: string[] = Array.isArray(s.itemIds)
    ? s.itemIds
    : (Object.values(s.itemIds as any) as string[]);
  return ids
    .map((id) => items.find((i) => i.id === id))
    .filter((i): i is ClothingItem => !!i);
}

export function WeekPlanner({ forecast }: { forecast: DailyForecast[] }) {
  const { items, savedOutfits, weekPlan, setPlanLook, saveOutfit, updateSavedOutfit } =
    useWardrobe();
  const [open, setOpen] = useState(false);
  const [pickingDay, setPickingDay] = useState<string | null>(null);
  const [pickOcc, setPickOcc] = useState<Occasion | 'all'>('all');
  const [pickSeason, setPickSeason] = useState<Season | 'all'>('all');

  // builder de look novo/edição dentro do planejador
  const [building, setBuilding] = useState(false);
  const [builderOutfit, setBuilderOutfit] = useState<Outfit>({});
  const [builderSlot, setBuilderSlot] = useState<OutfitSlot | null>(null);
  const [editingLookId, setEditingLookId] = useState<string | null>(null);

  function openPicker(date: string) {
    setPickingDay(date);
    setPickOcc('all');
    setBuilding(false);
    setBuilderOutfit({});
    setEditingLookId(null);
    // pré-seleciona a estação do dia escolhido (facilita a escolha)
    setPickSeason(currentSeasonBR(new Date(`${date}T12:00:00`)));
  }

  // Editar as peças do look já atribuído a um dia (abre o construtor preenchido).
  function openLookEditor(date: string, savedId: string) {
    const s = savedOutfits.find((x) => x.id === savedId);
    if (!s) return;
    setPickingDay(date);
    setBuilding(true);
    setEditingLookId(savedId);
    setBuilderOutfit(outfitFromPieces(resolveIds(s, items)));
  }

  function closePicker() {
    setPickingDay(null);
    setBuilding(false);
    setBuilderOutfit({});
    setBuilderSlot(null);
    setEditingLookId(null);
  }

  function handleBuilderPick(item: ClothingItem | null) {
    if (!builderSlot) return;
    setBuilderOutfit((prev) => {
      const next = { ...prev };
      if (item) next[builderSlot] = item;
      else delete next[builderSlot];
      return next;
    });
    setBuilderSlot(null);
  }

  function saveBuilt() {
    if (!pickingDay) return;
    const pieces = outfitPieces(builderOutfit);
    if (pieces.length === 0) return;
    if (editingLookId) {
      // edita o look salvo (reflete na aba Salvos e mantém no dia)
      updateSavedOutfit(editingLookId, { itemIds: pieces.map((p) => p.id) });
    } else {
      const season = currentSeasonBR(new Date(`${pickingDay}T12:00:00`));
      const saved = saveOutfit(builderOutfit, { seasons: [season] });
      setPlanLook(pickingDay, saved.id);
    }
    closePicker();
  }

  const builderHasPieces = BUILDER_SLOTS.some((s) => builderOutfit[s]);

  const pickList = savedOutfits.filter(
    (s) =>
      (pickOcc === 'all' || savedOccasions(s).includes(pickOcc)) &&
      (pickSeason === 'all' || savedSeasons(s).includes(pickSeason)),
  );

  if (!forecast || forecast.length === 0) return null;
  const tKey = todayKey();

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.header} onPress={() => setOpen((v) => !v)}>
        <Text style={styles.title}>📅 Programar a semana</Text>
        <Text style={styles.toggle}>{open ? 'esconder' : 'abrir'}</Text>
      </Pressable>

      {open &&
        forecast.map((day) => {
          const isToday = day.date === tKey;
          const savedId = weekPlan[day.date];
          const saved = savedId ? savedOutfits.find((s) => s.id === savedId) : undefined;
          const pieces = saved ? resolveIds(saved, items) : [];
          return (
            <View key={day.date} style={[styles.dayCard, isToday && styles.dayToday]}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayLabel}>
                  {weekdayLabel(day.date)}
                  {isToday ? ' · hoje' : ''}
                </Text>
                <Text style={styles.dayTemp}>
                  {day.tempMax}° / {day.tempMin}°
                </Text>
              </View>
              <Text style={styles.dayCond}>
                {day.description}
                {day.precipitationProb > 0 ? ` · 💧 ${day.precipitationProb}%` : ''}
              </Text>

              {saved && pieces.length > 0 ? (
                <>
                  <View style={styles.thumbs}>
                    {pieces.map((p) => (
                      <ItemThumb key={p.id} item={p} style={styles.thumb} rounded={theme.radius.sm} />
                    ))}
                  </View>
                  <View style={styles.dayActions}>
                    <Pressable onPress={() => openLookEditor(day.date, savedId!)} hitSlop={6}>
                      <Text style={styles.actionLink}>editar</Text>
                    </Pressable>
                    <Pressable onPress={() => openPicker(day.date)} hitSlop={6}>
                      <Text style={styles.actionLink}>trocar</Text>
                    </Pressable>
                    <Pressable onPress={() => setPlanLook(day.date, null)} hitSlop={6}>
                      <Text style={styles.actionRemove}>remover</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <Pressable style={styles.chooseBtn} onPress={() => openPicker(day.date)}>
                  <Text style={styles.chooseText}>+ escolher look</Text>
                </Pressable>
              )}
            </View>
          );
        })}

      <Modal
        visible={!!pickingDay}
        transparent
        animationType="slide"
        onRequestClose={closePicker}
      >
        <Pressable style={styles.overlay} onPress={closePicker}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            {building ? (
              <>
                <Text style={styles.sheetTitle}>
                  {editingLookId ? 'Editar look do dia' : 'Montar look novo'}
                </Text>
                <View style={styles.builderGrid}>
                  {BUILDER_SLOTS.map((slot) => {
                    const it = builderOutfit[slot];
                    return (
                      <Pressable
                        key={slot}
                        style={styles.builderCell}
                        onPress={() => setBuilderSlot(slot)}
                      >
                        {it ? (
                          <>
                            <ItemThumb item={it} style={styles.builderImg} rounded={theme.radius.sm} />
                            <Text style={styles.builderName} numberOfLines={1}>
                              {it.name}
                            </Text>
                          </>
                        ) : (
                          <>
                            <View style={[styles.builderImg, styles.builderAdd]}>
                              <Text style={styles.builderPlus}>+</Text>
                            </View>
                            <Text style={styles.builderName}>{CATEGORY_LABELS[slot]}</Text>
                          </>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.builderBtns}>
                  <PrimaryButton
                    label="Voltar"
                    variant="outline"
                    onPress={() => setBuilding(false)}
                    style={{ flex: 1 }}
                  />
                  <PrimaryButton
                    label={editingLookId ? 'Salvar alterações' : 'Salvar e usar'}
                    onPress={saveBuilt}
                    disabled={!builderHasPieces}
                    style={{ flex: 1 }}
                  />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.sheetTitle}>Escolher look salvo</Text>
                {savedOutfits.length === 0 ? (
                  <Text style={styles.empty}>
                    Você ainda não tem looks salvos — monte um novo abaixo, ou salve na tela Hoje (♡).
                  </Text>
                ) : (
                  <>
                    <Text style={styles.filterLabel}>Ocasião</Text>
                    <View style={styles.filterRow}>
                      <Chip label="Tudo" active={pickOcc === 'all'} onPress={() => setPickOcc('all')} />
                      {OCCASIONS.map((o) => (
                        <Chip
                          key={o.id}
                          label={o.label}
                          active={pickOcc === o.id}
                          onPress={() => setPickOcc(o.id)}
                        />
                      ))}
                    </View>

                    <Text style={styles.filterLabel}>Estação</Text>
                    <View style={styles.filterRow}>
                      <Chip
                        label="Tudo"
                        active={pickSeason === 'all'}
                        onPress={() => setPickSeason('all')}
                      />
                      {SEASONS.map((s) => (
                        <Chip
                          key={s.id}
                          label={`${s.emoji} ${s.label}`}
                          active={pickSeason === s.id}
                          onPress={() => setPickSeason(s.id)}
                        />
                      ))}
                    </View>

                    {pickList.length === 0 ? (
                      <Text style={styles.empty}>Nenhum look salvo com esse filtro.</Text>
                    ) : (
                      <ScrollView style={{ maxHeight: 300 }}>
                        {pickList.map((s) => {
                          const pcs = resolveIds(s, items);
                          if (pcs.length === 0) return null;
                          return (
                            <Pressable
                              key={s.id}
                              style={styles.pickRow}
                              onPress={() => {
                                if (pickingDay) setPlanLook(pickingDay, s.id);
                                closePicker();
                              }}
                            >
                              <View style={styles.pickThumbs}>
                                {pcs.slice(0, 5).map((p) => (
                                  <ItemThumb
                                    key={p.id}
                                    item={p}
                                    style={styles.pickThumb}
                                    rounded={theme.radius.sm}
                                  />
                                ))}
                              </View>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    )}
                  </>
                )}
                <PrimaryButton
                  label="✏️ Montar look novo"
                  onPress={() => setBuilding(true)}
                  style={{ marginTop: 12 }}
                />
                <PrimaryButton
                  label="Fechar"
                  variant="outline"
                  onPress={closePicker}
                  style={{ marginTop: 10 }}
                />
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {builderSlot && (
        <PiecePicker
          visible
          category={builderSlot}
          items={items}
          selectedId={builderOutfit[builderSlot]?.id}
          onSelect={handleBuilderPick}
          onClose={() => setBuilderSlot(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 28, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  toggle: { fontSize: 14, color: theme.colors.accent, fontWeight: '600' },
  dayCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    marginBottom: 10,
    ...theme.shadow.card,
  },
  dayToday: { borderWidth: 1.5, borderColor: theme.colors.accent },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    textTransform: 'capitalize',
  },
  dayTemp: { fontSize: 14, fontWeight: '700', color: theme.colors.accent },
  dayCond: { fontSize: 12, color: theme.colors.muted, marginTop: 2, marginBottom: 10 },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  thumb: { width: 44, height: 56 },
  dayActions: { flexDirection: 'row', gap: 16, marginTop: 10 },
  actionLink: { fontSize: 13, color: theme.colors.accent2, fontWeight: '700' },
  actionRemove: { fontSize: 13, color: theme.colors.muted, fontWeight: '600' },
  chooseBtn: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  chooseText: { fontSize: 13, color: theme.colors.accent, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.bg,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    padding: 20,
    paddingBottom: 28,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  builderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  builderCell: { width: '30%' },
  builderImg: { height: 84, borderRadius: theme.radius.md },
  builderAdd: {
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  builderPlus: { fontSize: 26, color: theme.colors.muted },
  builderName: { fontSize: 11, color: theme.colors.text, marginTop: 4 },
  builderBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  empty: { fontSize: 14, color: theme.colors.muted, paddingVertical: 16, lineHeight: 20 },
  pickRow: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pickThumbs: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pickThumb: { width: 48, height: 60 },
});
