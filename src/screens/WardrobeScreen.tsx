// Guarda-roupa: grade de peças estilo Pinterest, com filtro por categoria.

import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import { uploadImage, isDataUrl } from '../cloudStorage';

const FILTERS: (Category | 'all')[] = ['all', 'top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory'];

export function WardrobeScreen({
  onAdd,
  onEdit,
}: {
  onAdd: () => void;
  onEdit: (id: string) => void;
}) {
  const { items, removeItem, clearAll, updateItem } = useWardrobe();
  const [filter, setFilter] = useState<Category | 'all'>('all');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  // Sobe pro Storage as fotos que ainda estão como data URL (pesadas no banco).
  async function syncNow() {
    if (syncing) return;
    const pending = items.filter((i) => isDataUrl(i.imageUri));
    if (pending.length === 0) {
      setSyncMsg('Tudo já está salvo na nuvem ✓');
      setTimeout(() => setSyncMsg(null), 3000);
      return;
    }
    setSyncing(true);
    setSyncMsg(`Enviando fotos… (0/${pending.length})`);
    let ok = 0;
    for (const it of pending) {
      try {
        const url = await uploadImage(it.imageUri);
        updateItem(it.id, { imageUri: url });
        ok++;
      } catch {
        // continua nas próximas
      }
      setSyncMsg(`Enviando fotos… (${ok}/${pending.length})`);
    }
    setSyncing(false);
    setSyncMsg(
      ok === pending.length
        ? `✓ ${ok} foto(s) salvas na nuvem!`
        : `Enviei ${ok} de ${pending.length}. Tente de novo pra concluir.`,
    );
    setTimeout(() => setSyncMsg(null), 5000);
  }
  // Confirmação no app (Alert do RN é invisível na web).
  const [confirm, setConfirm] = useState<{
    title: string;
    text: string;
    danger: string;
    onOk: () => void;
  } | null>(null);

  function confirmClearAll() {
    setConfirm({
      title: 'Limpar guarda-roupa?',
      text: `Isso apaga todas as ${items.length} peças e os looks salvos. Não dá para desfazer.`,
      danger: 'Apagar tudo',
      onOk: clearAll,
    });
  }

  function confirmDelete(item: ClothingItem) {
    setConfirm({
      title: 'Excluir esta peça?',
      text: `"${item.name}" sai do closet e dos looks. Não dá para desfazer.`,
      danger: 'Excluir',
      onOk: () => removeItem(item.id),
    });
  }

  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter((i) => i.category === filter)),
    [items, filter],
  );

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

      {items.length > 0 && (
        <View style={styles.syncRow}>
          <Pressable style={styles.syncBtn} onPress={syncNow} disabled={syncing}>
            <Ionicons name="cloud-upload-outline" size={16} color={theme.colors.accent} />
            <Text style={styles.syncText}>
              {syncing ? 'Sincronizando…' : 'Sincronizar na nuvem'}
            </Text>
          </Pressable>
          {syncMsg && <Text style={styles.syncMsg}>{syncMsg}</Text>}
        </View>
      )}

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
              <View style={styles.cardWrap}>
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
                <Pressable
                  style={styles.deleteBtn}
                  onPress={() => confirmDelete(item)}
                  hitSlop={8}
                >
                  <Ionicons name="trash" size={15} color="#fff" />
                </Pressable>
              </View>
            );
          }}
        />
      )}

      <Modal
        visible={!!confirm}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirm(null)}
      >
        <Pressable style={styles.overlay} onPress={() => setConfirm(null)}>
          <Pressable style={styles.confirmBox} onPress={() => {}}>
            <Text style={styles.confirmTitle}>{confirm?.title}</Text>
            <Text style={styles.confirmText}>{confirm?.text}</Text>
            <View style={styles.confirmBtns}>
              <Pressable style={styles.cancelBtn} onPress={() => setConfirm(null)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={styles.dangerBtn}
                onPress={() => {
                  confirm?.onOk();
                  setConfirm(null);
                }}
              >
                <Text style={styles.dangerText}>{confirm?.danger}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  syncRow: { paddingHorizontal: 20, paddingBottom: 12, gap: 6 },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.accentSoft,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
  },
  syncText: { color: theme.colors.accent, fontWeight: '700', fontSize: theme.font.small },
  syncMsg: { fontSize: theme.font.small, color: theme.colors.muted, fontWeight: '600' },
  filters: { paddingBottom: 14 },
  cardWrap: { flex: 1, position: 'relative' },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 8,
    ...theme.shadow.card,
  },
  deleteBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
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
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  confirmBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 22,
    width: '100%',
    maxWidth: 360,
    ...theme.shadow.card,
  },
  confirmTitle: { fontSize: theme.font.h2, fontWeight: '800', color: theme.colors.text },
  confirmText: {
    fontSize: theme.font.body,
    color: theme.colors.muted,
    marginTop: 8,
    lineHeight: 20,
  },
  confirmBtns: { flexDirection: 'row', gap: 10, marginTop: 22, justifyContent: 'flex-end' },
  cancelBtn: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceAlt,
  },
  cancelText: { color: theme.colors.text, fontWeight: '700', fontSize: theme.font.small },
  dangerBtn: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.danger,
  },
  dangerText: { color: '#fff', fontWeight: '800', fontSize: theme.font.small },
});
