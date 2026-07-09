// Tela "Hoje": clima do dia + ocasião → look sugerido pelo motor de regras.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  savedOccasions,
  savedSeasons,
} from '../types';
import { Chip, PrimaryButton } from '../components/ui';
import { ItemThumb } from '../components/ItemThumb';
import { PiecePicker } from '../components/PiecePicker';
import { WeekPlanner } from '../components/WeekPlanner';
import { AvatarTryOn } from '../components/AvatarTryOn';
import { useWardrobe } from '../store';
import { useAuth } from '../auth';
import { Weather, fallbackWeather, getWeather } from '../weather';
import { suggestOutfit, swapSlot } from '../suggestion';

const SLOT_ORDER: OutfitSlot[] = ['outerwear', 'dress', 'top', 'bottom', 'shoes', 'accessory'];

type ManualEntry =
  | { kind: 'slot'; slot: OutfitSlot }
  | { kind: 'extraTop'; index: number }
  | { kind: 'addTop' };

// Ordem das células no modo manual, com camadas extras de "parte de cima"
// e um botão para adicionar mais uma logo após o slot de cima.
function buildManualEntries(outfit: Outfit): ManualEntry[] {
  const entries: ManualEntry[] = [];
  SLOT_ORDER.forEach((slot) => {
    entries.push({ kind: 'slot', slot });
    if (slot === 'top') {
      (outfit.extraTops ?? []).forEach((_, i) => entries.push({ kind: 'extraTop', index: i }));
      entries.push({ kind: 'addTop' });
    }
  });
  return entries;
}

// Nível de agasalho alvo a partir da sensação térmica (igual ao motor de regras).
function targetWarmth(feelsLikeC: number): number {
  if (feelsLikeC >= 28) return 1;
  if (feelsLikeC >= 23) return 2;
  if (feelsLikeC >= 17) return 3;
  if (feelsLikeC >= 10) return 4;
  return 5;
}

// Reconstrói um Outfit a partir de uma lista de peças (para marcar como usado).
function buildOutfitFromPieces(pieces: ClothingItem[]): Outfit {
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

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function weekdayLabel(): string {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
    .format(new Date());
}

export function TodayScreen({ onAdd }: { onAdd: () => void }) {
  const { items, savedOutfits, markOutfitWorn, saveOutfit } = useWardrobe();
  const { signOut } = useAuth();
  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [occasion, setOccasion] = useState<Occasion>('casual');
  const [seed, setSeed] = useState(1);
  const [outfit, setOutfit] = useState<Outfit>({});
  const [notes, setNotes] = useState<string[]>([]);
  const [justSaved, setJustSaved] = useState(false);
  const [saveSeason, setSaveSeason] = useState<Season>(currentSeasonBR());
  const [manual, setManual] = useState(false);
  const [pickerSlot, setPickerSlot] = useState<OutfitSlot | null>(null);
  // -1 = adicionar nova camada de cima; >=0 = editar a camada nesse índice
  const [extraTopPicker, setExtraTopPicker] = useState<number | null>(null);
  const [tryOn, setTryOn] = useState(false);

  const fetchWeather = useCallback(async () => {
    setLoadingWeather(true);
    setWeatherError(null);
    try {
      const w = await getWeather();
      setWeather(w);
    } catch (e: any) {
      setWeather(fallbackWeather());
      setWeatherError(e?.message ?? 'Não foi possível obter o clima');
    } finally {
      setLoadingWeather(false);
    }
  }, []);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  // Recalcula o look quando muda clima, ocasião, seed ou acervo.
  const result = useMemo(() => {
    if (!weather || items.length === 0) return null;
    return suggestOutfit(items, { weather, occasion, seed });
  }, [weather, items, occasion, seed]);

  useEffect(() => {
    // no modo manual não sobrescrevemos o look que o usuário montou
    if (result && !manual) {
      setOutfit(result.outfit);
      setNotes(result.notes);
      setJustSaved(false); // novo look → permite salvar de novo
    }
  }, [result, manual]);

  function resolveSavedIds(s: SavedOutfit): ClothingItem[] {
    const ids: string[] = Array.isArray(s.itemIds)
      ? s.itemIds
      : (Object.values(s.itemIds as any) as string[]);
    return ids
      .map((id) => items.find((i) => i.id === id))
      .filter((i): i is ClothingItem => !!i);
  }

  // Escolhe o melhor look SALVO para o dia: casa ocasião + estação + temperatura.
  const savedSuggestion = useMemo(() => {
    if (!weather || savedOutfits.length === 0) return null;
    const tw = targetWarmth(weather.feelsLikeC);
    const season = currentSeasonBR();
    let best: { saved: SavedOutfit; pieces: ClothingItem[]; occMatch: boolean; seaMatch: boolean } | null =
      null;
    let bestScore = -Infinity;
    for (const s of savedOutfits) {
      const pieces = resolveSavedIds(s);
      if (pieces.length === 0) continue;
      const occMatch = savedOccasions(s).includes(occasion);
      const seaMatch = savedSeasons(s).includes(season);
      const avg = pieces.reduce((a, p) => a + p.warmth, 0) / pieces.length;
      let score = 0;
      if (occMatch) score += 100;
      if (seaMatch) score += 60;
      score -= Math.abs(avg - tw) * 14;
      if (score > bestScore) {
        bestScore = score;
        best = { saved: s, pieces, occMatch, seaMatch };
      }
    }
    return best;
  }, [savedOutfits, items, weather, occasion]);

  function handleUseSaved() {
    if (savedSuggestion) markOutfitWorn(buildOutfitFromPieces(savedSuggestion.pieces));
  }

  const savedSugReason = (() => {
    if (!savedSuggestion || !weather) return '';
    const parts: string[] = [];
    if (savedSuggestion.occMatch) {
      const lbl = OCCASIONS.find((o) => o.id === occasion)?.label.toLowerCase();
      if (lbl) parts.push(`combina com ${lbl}`);
    }
    if (savedSuggestion.seaMatch) parts.push(`bom para o ${currentSeasonBR()}`);
    parts.push(`adequado a ${weather.feelsLikeC}°`);
    return parts.join(' · ');
  })();

  function handleSaveOutfit() {
    saveOutfit(outfit, { occasions: [occasion], seasons: [saveSeason] });
    setJustSaved(true);
  }

  function toggleManual() {
    setManual((m) => {
      const next = !m;
      if (!next) setSeed((s) => s + 1); // voltar à sugestão → gera de novo
      return next;
    });
  }

  function handlePick(item: ClothingItem | null) {
    if (pickerSlot) {
      setOutfit((prev) => {
        const next = { ...prev };
        if (item) next[pickerSlot] = item;
        else delete next[pickerSlot];
        return next;
      });
      setJustSaved(false);
    }
    setPickerSlot(null);
  }

  function handleExtraTopPick(item: ClothingItem | null) {
    if (extraTopPicker === null) {
      setExtraTopPicker(null);
      return;
    }
    setOutfit((prev) => {
      const tops = [...(prev.extraTops ?? [])];
      if (extraTopPicker === -1) {
        if (item) tops.push(item);
      } else if (item) {
        tops[extraTopPicker] = item;
      } else {
        tops.splice(extraTopPicker, 1);
      }
      return { ...prev, extraTops: tops.length ? tops : undefined };
    });
    setJustSaved(false);
    setExtraTopPicker(null);
  }

  const filledSlots = SLOT_ORDER.filter((s) => outfit[s]);

  function handleSwap(slot: OutfitSlot) {
    if (!weather) return;
    const next = swapSlot(outfit, slot, items, { weather, occasion, seed: seed + 1 });
    if (next) setOutfit((prev) => ({ ...prev, [slot]: next }));
  }

  function handleWear() {
    markOutfitWorn(outfit);
    setSeed((s) => s + 1); // próxima sugestão evita repetir
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 110 }}>
      {/* Cabeçalho com clima */}
      <View style={styles.hero}>
        <View style={styles.brandRow}>
          <View style={styles.brandLeft}>
            <View style={styles.brandDot}>
              <Ionicons name="sparkles" size={13} color="#FFFFFF" />
            </View>
            <Text style={styles.brandName}>StyleSense AI</Text>
          </View>
          <View style={styles.headerBtns}>
            <Pressable style={styles.avatarBtn} onPress={() => setTryOn(true)}>
              <Ionicons name="person" size={14} color={theme.colors.accent} />
              <Text style={styles.avatarBtnText}>Avatar</Text>
            </Pressable>
            <Pressable style={styles.logoutBtn} onPress={signOut} hitSlop={8}>
              <Ionicons name="log-out-outline" size={18} color={theme.colors.muted} />
            </Pressable>
          </View>
        </View>
        <Text style={styles.greeting}>{greeting()}</Text>
        <Text style={styles.weekday}>{weekdayLabel()}</Text>

        <View style={styles.weatherCard}>
          {loadingWeather ? (
            <ActivityIndicator color={theme.colors.accent} />
          ) : weather ? (
            <>
              <View style={{ flex: 1 }}>
                <Text style={styles.temp}>{weather.tempC}°C</Text>
                <Text style={styles.weatherDesc}>
                  {weather.description}
                  {weather.place ? ` · ${weather.place}` : ''}
                </Text>
                <Text style={styles.weatherSub}>
                  Sensação {weather.feelsLikeC}° · vento {weather.windKmh} km/h
                  {weather.precipitationProb > 0 ? ` · 💧 ${weather.precipitationProb}%` : ''}
                </Text>
              </View>
              <Pressable onPress={fetchWeather} hitSlop={10}>
                <Text style={styles.refresh}>↻</Text>
              </Pressable>
            </>
          ) : null}
        </View>
        {weatherError && (
          <Text style={styles.weatherErr}>⚠️ {weatherError}. Usando clima estimado.</Text>
        )}
      </View>

      {/* Ocasião */}
      <Text style={styles.sectionLabel}>Para qual ocasião?</Text>
      <View style={styles.occasionRow}>
        {OCCASIONS.map((o) => (
          <Chip
            key={o.id}
            label={o.label}
            active={occasion === o.id}
            onPress={() => setOccasion(o.id)}
          />
        ))}
      </View>

      {/* Look sugerido */}
      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>✨</Text>
          <Text style={styles.emptyTitle}>Vamos montar seu primeiro look</Text>
          <Text style={styles.emptyText}>
            Cadastre algumas peças e eu monto sugestões diárias com base no clima e na sua agenda.
          </Text>
          <PrimaryButton label="+ Adicionar peças" onPress={onAdd} style={{ marginTop: 16 }} />
          <PrimaryButton
            label="🪞 Criar meu avatar"
            variant="outline"
            onPress={() => setTryOn(true)}
            style={{ marginTop: 10 }}
          />
        </View>
      ) : (
        <>
          <View style={styles.lookHeader}>
            <Text style={styles.sectionLabel}>{manual ? 'Meu look' : 'Look de hoje'}</Text>
            <View style={styles.headerActions}>
              {!manual && (
                <Pressable onPress={() => setSeed((s) => s + 1)} style={styles.regenBtn}>
                  <Text style={styles.regenText}>↻ Trocar tudo</Text>
                </Pressable>
              )}
              <Pressable onPress={toggleManual} style={styles.regenBtn}>
                <Text style={styles.regenText}>{manual ? '✨ Sugestão' : '✏️ Montar eu'}</Text>
              </Pressable>
            </View>
          </View>

          {manual ? (
            <View style={styles.lookGrid}>
              {buildManualEntries(outfit).map((e) => {
                if (e.kind === 'slot') {
                  const it = outfit[e.slot];
                  return (
                    <Pressable
                      key={`slot-${e.slot}`}
                      style={styles.lookItem}
                      onPress={() => setPickerSlot(e.slot)}
                    >
                      {it ? (
                        <>
                          <ItemThumb item={it} style={styles.lookImg} />
                          <Text style={styles.lookSlot}>{CATEGORY_LABELS[it.category]}</Text>
                          <Text style={styles.lookName} numberOfLines={1}>
                            {it.name}
                          </Text>
                          <Text style={styles.lookSwap}>toque para trocar</Text>
                        </>
                      ) : (
                        <>
                          <View style={[styles.lookImg, styles.addCell]}>
                            <Text style={styles.addPlus}>+</Text>
                          </View>
                          <Text style={styles.lookSlot}>{CATEGORY_LABELS[e.slot]}</Text>
                          <Text style={styles.lookSwap}>adicionar</Text>
                        </>
                      )}
                    </Pressable>
                  );
                }
                if (e.kind === 'extraTop') {
                  const it = outfit.extraTops?.[e.index];
                  if (!it) return null;
                  return (
                    <Pressable
                      key={`extra-${e.index}`}
                      style={styles.lookItem}
                      onPress={() => setExtraTopPicker(e.index)}
                    >
                      <ItemThumb item={it} style={styles.lookImg} />
                      <Text style={styles.lookSlot}>Parte de cima</Text>
                      <Text style={styles.lookName} numberOfLines={1}>
                        {it.name}
                      </Text>
                      <Text style={styles.lookSwap}>toque para trocar</Text>
                    </Pressable>
                  );
                }
                // addTop
                return (
                  <Pressable
                    key="add-top"
                    style={styles.lookItem}
                    onPress={() => setExtraTopPicker(-1)}
                  >
                    <View style={[styles.lookImg, styles.addCell]}>
                      <Text style={styles.addPlus}>+</Text>
                    </View>
                    <Text style={styles.lookSlot}>Outra parte de cima</Text>
                    <Text style={styles.lookSwap}>adicionar camada</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : filledSlots.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🤔</Text>
              <Text style={styles.emptyTitle}>Não consegui montar um look</Text>
              <Text style={styles.emptyText}>
                Falta uma parte de cima e uma de baixo (ou um vestido) e um calçado — ou toque em
                "✏️ Montar eu" para criar o seu.
              </Text>
            </View>
          ) : (
            <View style={styles.lookGrid}>
              {filledSlots.map((slot) => {
                const it = outfit[slot] as ClothingItem;
                return (
                  <Pressable key={slot} style={styles.lookItem} onPress={() => handleSwap(slot)}>
                    <ItemThumb item={it} style={styles.lookImg} />
                    <Text style={styles.lookSlot}>{CATEGORY_LABELS[it.category]}</Text>
                    <Text style={styles.lookName} numberOfLines={1}>
                      {it.name}
                    </Text>
                    <Text style={styles.lookSwap}>toque para trocar</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {!manual && notes.length > 0 && (
            <View style={styles.notes}>
              {notes.map((n, i) => (
                <Text key={i} style={styles.noteText}>
                  • {n}
                </Text>
              ))}
            </View>
          )}

          {(filledSlots.length > 0 || (outfit.extraTops?.length ?? 0) > 0) && (
            <View style={styles.seasonRow}>
              <Text style={styles.seasonHint}>Salvar para a estação:</Text>
              <View style={styles.seasonChips}>
                {SEASONS.map((s) => (
                  <Chip
                    key={s.id}
                    label={`${s.emoji} ${s.label}`}
                    active={saveSeason === s.id}
                    onPress={() => setSaveSeason(s.id)}
                  />
                ))}
              </View>
            </View>
          )}

          {(filledSlots.length > 0 || (outfit.extraTops?.length ?? 0) > 0) && (
            <>
              <View style={styles.actions}>
                <PrimaryButton label="👍 Vou usar este" onPress={handleWear} style={{ flex: 1 }} />
                <PrimaryButton
                  label={justSaved ? '❤️ Salvo' : '♡ Salvar'}
                  variant={justSaved ? 'solid' : 'outline'}
                  onPress={handleSaveOutfit}
                  style={{ flex: 1 }}
                />
              </View>
              <PrimaryButton
                label="🪞 Provar no avatar"
                variant="outline"
                onPress={() => setTryOn(true)}
                style={{ marginTop: 10 }}
              />
            </>
          )}

          {justSaved && (
            <Text style={styles.savedTip}>
              ❤️ Salvo na aba "Salvos" — filtre por ocasião e estação por lá.
            </Text>
          )}

          {!manual && savedSuggestion && (
            <View style={styles.savedSug}>
              <Text style={styles.sectionLabel}>💾 Dos seus salvos para hoje</Text>
              <View style={styles.savedSugCard}>
                <View style={styles.savedSugThumbs}>
                  {savedSuggestion.pieces.map((p) => (
                    <ItemThumb
                      key={p.id}
                      item={p}
                      style={styles.savedSugThumb}
                      rounded={theme.radius.sm}
                    />
                  ))}
                </View>
                {savedSugReason ? (
                  <Text style={styles.savedSugReason}>{savedSugReason}</Text>
                ) : null}
                <PrimaryButton
                  label="👍 Vou usar este"
                  variant="outline"
                  onPress={handleUseSaved}
                  style={{ marginTop: 12 }}
                />
              </View>
            </View>
          )}
        </>
      )}

      {weather?.forecast && weather.forecast.length > 0 && (
        <WeekPlanner forecast={weather.forecast} />
      )}

      {pickerSlot && (
        <PiecePicker
          visible
          category={pickerSlot}
          items={items}
          selectedId={outfit[pickerSlot]?.id}
          onSelect={handlePick}
          onClose={() => setPickerSlot(null)}
        />
      )}

      {extraTopPicker !== null && (
        <PiecePicker
          visible
          category="top"
          items={items}
          selectedId={extraTopPicker >= 0 ? outfit.extraTops?.[extraTopPicker]?.id : undefined}
          allowRemove={extraTopPicker >= 0}
          onSelect={handleExtraTopPick}
          onClose={() => setExtraTopPicker(null)}
        />
      )}

      <AvatarTryOn visible={tryOn} outfit={outfit} onClose={() => setTryOn(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  hero: { paddingHorizontal: 20, paddingTop: 8 },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  brandLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoutBtn: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accentSoft,
  },
  avatarBtnText: { color: theme.colors.accent, fontWeight: '700', fontSize: theme.font.small },
  brandDot: {
    width: 24,
    height: 24,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.accentDeep,
    letterSpacing: 0.2,
  },
  greeting: {
    fontSize: theme.font.display,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.8,
  },
  weekday: { fontSize: 15, color: theme.colors.muted, marginTop: 2, textTransform: 'capitalize' },
  weatherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 18,
    marginTop: 16,
    minHeight: 92,
    ...theme.shadow.card,
  },
  temp: { fontSize: 34, fontWeight: '700', color: theme.colors.text },
  weatherDesc: { fontSize: 15, color: theme.colors.text, marginTop: 2 },
  weatherSub: { fontSize: 13, color: theme.colors.muted, marginTop: 4 },
  refresh: { fontSize: 26, color: theme.colors.accent, paddingLeft: 12 },
  weatherErr: { fontSize: 12, color: theme.colors.muted, marginTop: 8 },
  sectionLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  occasionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20 },
  lookHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 20,
  },
  regenBtn: { marginTop: 12 },
  regenText: { color: theme.colors.accent2, fontWeight: '700', fontSize: 14 },
  headerActions: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  addCell: {
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPlus: { fontSize: 34, color: theme.colors.muted },
  lookGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 20,
  },
  lookItem: {
    width: '47%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 8,
    ...theme.shadow.card,
  },
  lookImg: { height: 160, borderRadius: theme.radius.sm },
  lookSlot: { fontSize: 11, color: theme.colors.accent, fontWeight: '700', marginTop: 8, textTransform: 'uppercase' },
  lookName: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginTop: 2 },
  lookSwap: { fontSize: 11, color: theme.colors.muted, marginTop: 2, marginBottom: 2 },
  notes: {
    marginHorizontal: 20,
    marginTop: 18,
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.md,
    padding: 14,
    gap: 4,
  },
  noteText: { fontSize: 13, color: theme.colors.text, lineHeight: 19 },
  seasonRow: { paddingHorizontal: 20, marginTop: 20 },
  seasonHint: { fontSize: 13, color: theme.colors.muted, marginBottom: 8 },
  seasonChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 14 },
  savedTip: {
    fontSize: 12,
    color: theme.colors.accent,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  savedSug: { marginTop: 28 },
  savedSugCard: {
    marginHorizontal: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 14,
    ...theme.shadow.card,
  },
  savedSugThumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  savedSugThumb: { width: 56, height: 72 },
  savedSugReason: { fontSize: 13, color: theme.colors.muted, marginTop: 10, lineHeight: 18 },
  savedSection: { marginTop: 28, paddingHorizontal: 20 },
  savedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionLabelInline: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  savedToggle: { fontSize: 14, color: theme.colors.accent, fontWeight: '600' },
  savedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 10,
    marginBottom: 10,
    ...theme.shadow.card,
  },
  savedThumbs: { flexDirection: 'row', gap: 8, flex: 1, flexWrap: 'wrap' },
  savedThumb: { width: 48, height: 62 },
  savedRemove: { fontSize: 18, color: theme.colors.muted, paddingHorizontal: 8 },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8, marginTop: 20 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  emptyText: { fontSize: 14, color: theme.colors.muted, textAlign: 'center', lineHeight: 20 },
});
