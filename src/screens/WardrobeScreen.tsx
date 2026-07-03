// Guarda-roupa: grade de peças estilo Pinterest, com filtro por categoria.

import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { theme } from '../theme';
import {
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
  COLORS,
  Category,
  ClothingItem,
} from '../types';
import { Chip } from '../components/ui';
import { ItemThumb } from '../components/ItemThumb';
import { useWardrobe } from '../store';

const FILTERS: (Category | 'all')[] = ['all', 'top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory'];

export function WardrobeScreen({
  onAdd,
  onEdit,
}: {
  onAdd: () => void;
  onEdit: (id: string) => void;
}) {
  const { items, removeItem, clearAll } = useWardrobe();
  const [filter, setFilter] = useState<Category | 'all'>('all');

  function confirmClearAll() {
    Alert.alert(
      'Limpar guarda-roupa',
      `Isso vai apagar todas as ${items.length} peças (e os looks salvos). Não dá para desfazer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Apagar tudo', style: 'destructive', onPress: clearAll },
      ],
    );
  }

  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter((i) => i.category === filter)),
    [items, filter],
  );

  function confirmDelete(item: ClothingItem) {
    Alert.alert(item.name, 'O que deseja fazer?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => removeItem(item.id),
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Meu guarda-roupa</Text>
        <View style={styles.headerRight}>
          <Text style={styles.count}>{items.length} peças</Text>
          {items.length > 0 && (
            <Pressable onPress={confirmClearAll} hitSlop={8}>
              <Text style={styles.clearAll}>Limpar tudo</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.filters}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTERS}
          keyExtractor={(f) => f}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
          renderItem={({ item: f }) => (
            <Chip
              label={f === 'all' ? 'Tudo' : `${CATEGORY_EMOJI[f]} ${CATEGORY_LABELS[f]}`}
              active={filter === f}
              onPress={() => setFilter(f)}
            />
          )}
        />
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🧺</Text>
          <Text style={styles.emptyTitle}>
            {items.length === 0 ? 'Seu guarda-roupa está vazio' : 'Nada nesta categoria'}
          </Text>
          <Text style={styles.emptyText}>
            {items.length === 0
              ? 'Adicione suas roupas para receber sugestões de looks.'
              : 'Tente outro filtro ou adicione uma peça.'}
          </Text>
          <Pressable style={styles.emptyBtn} onPress={onAdd}>
            <Text style={styles.emptyBtnText}>+ Adicionar peça</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 20 }}
          contentContainerStyle={{ gap: 12, paddingBottom: 100, paddingTop: 4 }}
          renderItem={({ item }) => {
            const color = COLORS.find((c) => c.id === item.colorId);
            return (
              <Pressable
                style={styles.card}
                onPress={() => onEdit(item.id)}
                onLongPress={() => confirmDelete(item)}
                delayLongPress={350}
              >
                <ItemThumb item={item} style={styles.cardImg} />
                <Text style={styles.cardName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {color?.label} · usada {item.wearCount}x
                </Text>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  title: { fontSize: theme.font.title, fontWeight: '700', color: theme.colors.text },
  headerRight: { alignItems: 'flex-end', gap: 2 },
  count: { fontSize: 14, color: theme.colors.muted },
  clearAll: { fontSize: 13, color: theme.colors.danger, fontWeight: '600' },
  filters: { paddingBottom: 14 },
  card: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 8,
    ...theme.shadow.card,
  },
  cardImg: { height: 180, borderRadius: theme.radius.sm },
  cardName: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginTop: 8 },
  cardMeta: { fontSize: 12, color: theme.colors.muted, marginTop: 2, marginBottom: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  emptyText: { fontSize: 14, color: theme.colors.muted, textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    marginTop: 10,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: theme.radius.pill,
  },
  emptyBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
