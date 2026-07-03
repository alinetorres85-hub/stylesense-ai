// Tela "Inspiração": monta buscas de looks completos no Pinterest e Google
// Imagens a partir de uma peça-base do guarda-roupa + ocasião.

import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { theme } from '../theme';
import { ClothingItem, OCCASIONS, Occasion } from '../types';
import { Chip, PrimaryButton } from '../components/ui';
import { ItemThumb } from '../components/ItemThumb';
import { useWardrobe } from '../store';
import {
  buildQueries,
  currentSeasonBR,
  googleImagesUrl,
  pinterestUrl,
} from '../inspiration';

async function openUrl(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Não consegui abrir', 'Verifique se há um navegador instalado.');
  }
}

export function InspirationScreen({ onAdd }: { onAdd: () => void }) {
  const { items } = useWardrobe();
  const [baseId, setBaseId] = useState<string | null>(null);
  const [occasion, setOccasion] = useState<Occasion>('casual');

  const base = useMemo(
    () => items.find((i) => i.id === baseId) ?? null,
    [items, baseId],
  );
  const queries = useMemo(
    () => buildQueries(base, occasion),
    [base, occasion],
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Inspiração</Text>
        <Text style={styles.subtitle}>
          Looks reais do Pinterest e da web, filtrados pelo que você tem. Escolha uma
          peça e a ocasião — eu monto a busca certinha.
        </Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>💡</Text>
          <Text style={styles.emptyTitle}>Cadastre uma peça primeiro</Text>
          <Text style={styles.emptyText}>
            Com suas roupas cadastradas, eu monto inspirações combinando com elas.
          </Text>
          <PrimaryButton label="+ Adicionar peças" onPress={onAdd} style={{ marginTop: 16 }} />
        </View>
      ) : (
        <>
          {/* Seleção de peça-base */}
          <Text style={styles.sectionLabel}>Inspirar a partir de qual peça?</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={items}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ gap: 10, paddingHorizontal: 20 }}
            ListHeaderComponent={
              <Pressable
                onPress={() => setBaseId(null)}
                style={[styles.noneCard, baseId === null && styles.noneCardActive]}
              >
                <Text style={styles.noneEmoji}>👗</Text>
                <Text style={styles.noneText}>Geral</Text>
              </Pressable>
            }
            renderItem={({ item }) => {
              const active = baseId === item.id;
              return (
                <Pressable onPress={() => setBaseId(item.id)} style={styles.baseCard}>
                  <ItemThumb
                    item={item}
                    style={[styles.baseImg, active && styles.baseImgActive]}
                  />
                  <Text style={styles.baseName} numberOfLines={1}>
                    {item.name}
                  </Text>
                </Pressable>
              );
            }}
          />

          {/* Ocasião */}
          <Text style={styles.sectionLabel}>Ocasião</Text>
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

          {base && (
            <View style={styles.basePreview}>
              <ItemThumb item={base} style={styles.basePreviewImg} />
              <Text style={styles.basePreviewText}>
                Inspirações combinando com{' '}
                <Text style={{ fontWeight: '700', color: theme.colors.text }}>{base.name}</Text>{' '}
                · estação: {currentSeasonBR()}
              </Text>
            </View>
          )}

          {/* Buscas */}
          <Text style={styles.sectionLabel}>Buscas sugeridas</Text>
          <View style={styles.queries}>
            {queries.map((q, idx) => (
              <View key={idx} style={styles.queryCard}>
                <Text style={styles.queryTitle}>{q.title}</Text>
                <Text style={styles.querySub}>{q.subtitle}</Text>
                <View style={styles.queryBtns}>
                  <Pressable
                    style={[styles.srcBtn, styles.pinBtn]}
                    onPress={() => openUrl(pinterestUrl(q.query))}
                  >
                    <Text style={styles.pinBtnText}>📌 Pinterest</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.srcBtn, styles.googleBtn]}
                    onPress={() => openUrl(googleImagesUrl(q.query))}
                  >
                    <Text style={styles.googleBtnText}>🔍 Google Imagens</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.footnote}>
            As buscas abrem no navegador ou no app do Pinterest. As fotos são de terceiros —
            use como inspiração para montar o look com as suas peças.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 8 },
  title: { fontSize: theme.font.title, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.muted, marginTop: 6, lineHeight: 20 },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    paddingHorizontal: 20,
    marginTop: 22,
    marginBottom: 12,
  },
  occasionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20 },
  noneCard: {
    width: 72,
    height: 92,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  noneCardActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
  noneEmoji: { fontSize: 26 },
  noneText: { fontSize: 12, color: theme.colors.text, fontWeight: '600' },
  baseCard: { width: 72 },
  baseImg: { width: 72, height: 92 },
  baseImgActive: { borderWidth: 2, borderColor: theme.colors.accent },
  baseName: { fontSize: 11, color: theme.colors.text, marginTop: 4 },
  basePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 18,
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.md,
    padding: 12,
  },
  basePreviewImg: { width: 40, height: 52, borderRadius: theme.radius.sm },
  basePreviewText: { flex: 1, fontSize: 13, color: theme.colors.muted, lineHeight: 18 },
  queries: { paddingHorizontal: 20, gap: 12 },
  queryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    ...theme.shadow.card,
  },
  queryTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  querySub: { fontSize: 13, color: theme.colors.muted, marginTop: 2, marginBottom: 12 },
  queryBtns: { flexDirection: 'row', gap: 10 },
  srcBtn: {
    flex: 1,
    height: 42,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBtn: { backgroundColor: '#E60023' },
  pinBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  googleBtn: { borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  googleBtnText: { color: theme.colors.text, fontWeight: '600', fontSize: 13 },
  footnote: {
    fontSize: 12,
    color: theme.colors.muted,
    paddingHorizontal: 20,
    marginTop: 18,
    lineHeight: 18,
  },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8, marginTop: 30 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  emptyText: { fontSize: 14, color: theme.colors.muted, textAlign: 'center', lineHeight: 20 },
});
