// Modal para escolher uma peça de uma categoria (usado para montar look/sudoku à mão).

import React from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { theme } from '../theme';
import { CATEGORY_LABELS, Category, ClothingItem } from '../types';
import { ItemThumb } from './ItemThumb';

export function PiecePicker({
  visible,
  category,
  items,
  selectedId,
  excludeIds,
  allowRemove = true,
  onSelect,
  onClose,
}: {
  visible: boolean;
  category: Category;
  items: ClothingItem[];
  selectedId?: string;
  excludeIds?: Set<string>;
  allowRemove?: boolean;
  onSelect: (item: ClothingItem | null) => void;
  onClose: () => void;
}) {
  const list = items.filter(
    (i) =>
      i.category === category &&
      (!excludeIds || !excludeIds.has(i.id) || i.id === selectedId),
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Escolher {CATEGORY_LABELS[category].toLowerCase()}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          {list.length === 0 ? (
            <Text style={styles.empty}>
              Nenhuma peça desta categoria. Cadastre na aba Adicionar.
            </Text>
          ) : (
            <FlatList
              data={list}
              keyExtractor={(i) => i.id}
              numColumns={3}
              columnWrapperStyle={{ gap: 10 }}
              contentContainerStyle={{ gap: 10, paddingBottom: 8 }}
              style={{ maxHeight: 360 }}
              renderItem={({ item }) => {
                const active = item.id === selectedId;
                return (
                  <Pressable style={styles.cell} onPress={() => onSelect(item)}>
                    <ItemThumb
                      item={item}
                      style={[styles.cellImg, active && styles.cellImgActive]}
                    />
                    <Text style={styles.cellName} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </Pressable>
                );
              }}
            />
          )}

          {allowRemove && (
            <Pressable style={styles.removeBtn} onPress={() => onSelect(null)}>
              <Text style={styles.removeText}>Remover do look</Text>
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.bg,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    padding: 20,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  close: { fontSize: 18, color: theme.colors.muted },
  empty: { fontSize: 14, color: theme.colors.muted, paddingVertical: 24, textAlign: 'center' },
  cell: { flex: 1 / 3 },
  cellImg: { height: 120, borderRadius: theme.radius.md },
  cellImgActive: { borderWidth: 2, borderColor: theme.colors.accent },
  cellName: { fontSize: 11, color: theme.colors.text, marginTop: 4 },
  removeBtn: {
    marginTop: 14,
    height: 46,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: theme.colors.danger, fontWeight: '600', fontSize: 14 },
});
