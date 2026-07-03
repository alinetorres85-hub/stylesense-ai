// Tela "Diário": fotografe o look que você está usando hoje e veja o histórico.

import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../theme';
import { DailyLook } from '../types';
import { PrimaryButton } from '../components/ui';
import { ZoomableImage } from '../components/ZoomableImage';
import { useWardrobe } from '../store';
import { persistImage } from '../images';

function formatDate(ts: number): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(ts));
}

export function DiaryScreen() {
  const { dailyLooks, addDailyLook, removeDailyLook } = useWardrobe();
  const [pendingUri, setPendingUri] = useState<string>('');
  const [note, setNote] = useState('');
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Autorize a câmera para fotografar seu look.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      quality: 0.6,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (!res.canceled && res.assets[0]) setPendingUri(res.assets[0].uri);
  }

  async function pickFromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Autorize a galeria para escolher a foto.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (!res.canceled && res.assets[0]) setPendingUri(res.assets[0].uri);
  }

  function saveLook() {
    const saved = persistImage(pendingUri);
    addDailyLook(saved, note.trim() || undefined);
    setPendingUri('');
    setNote('');
  }

  function confirmRemove(look: DailyLook) {
    Alert.alert('Remover do diário', 'Apagar esta foto do dia?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => removeDailyLook(look.id) },
    ]);
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={dailyLooks}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{ paddingBottom: 110 }}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Diário de looks</Text>
            <Text style={styles.subtitle}>
              Registre o que você vestiu hoje e acompanhe seu estilo ao longo do tempo.
            </Text>

            {pendingUri ? (
              <View style={styles.previewCard}>
                <Image source={{ uri: pendingUri }} style={styles.previewImg} resizeMode="cover" />
                <TextInput
                  style={styles.noteInput}
                  placeholder="Uma nota sobre o look (opcional)"
                  placeholderTextColor={theme.colors.muted}
                  value={note}
                  onChangeText={setNote}
                />
                <View style={styles.previewBtns}>
                  <PrimaryButton
                    label="Cancelar"
                    variant="outline"
                    onPress={() => {
                      setPendingUri('');
                      setNote('');
                    }}
                    style={{ flex: 1 }}
                  />
                  <PrimaryButton label="Salvar no diário" onPress={saveLook} style={{ flex: 1 }} />
                </View>
              </View>
            ) : (
              <View style={styles.captureBtns}>
                <PrimaryButton label="📷 Fotografar" onPress={takePhoto} style={{ flex: 1 }} />
                <PrimaryButton
                  label="🖼️ Galeria"
                  variant="outline"
                  onPress={pickFromGallery}
                  style={{ flex: 1 }}
                />
              </View>
            )}

            {dailyLooks.length > 0 && (
              <Text style={styles.histLabel}>Seu histórico</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          !pendingUri ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📸</Text>
              <Text style={styles.emptyTitle}>Comece seu diário</Text>
              <Text style={styles.emptyText}>
                Tire uma foto do look de hoje. Com o tempo você verá um mural do seu estilo.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.entry}>
            <Pressable
              onPress={() => setViewerUri(item.imageUri)}
              onLongPress={() => confirmRemove(item)}
              delayLongPress={350}
            >
              <Image source={{ uri: item.imageUri }} style={styles.entryImg} resizeMode="cover" />
              <View style={styles.zoomBadge}>
                <Text style={styles.zoomBadgeText}>⤢ ampliar</Text>
              </View>
            </Pressable>
            <View style={styles.entryMeta}>
              <Text style={styles.entryDate}>{formatDate(item.createdAt)}</Text>
              {item.note ? <Text style={styles.entryNote}>{item.note}</Text> : null}
              <Pressable onPress={() => confirmRemove(item)} hitSlop={8}>
                <Text style={styles.entryRemove}>remover</Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      <Modal
        visible={!!viewerUri}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerUri(null)}
      >
        <View style={styles.viewer}>
          {viewerUri && <ZoomableImage key={viewerUri} uri={viewerUri} />}
          <Text style={styles.viewerHint}>pinça para zoom · toque duplo</Text>
          <Pressable style={styles.viewerClose} onPress={() => setViewerUri(null)} hitSlop={12}>
            <Text style={styles.viewerCloseText}>✕</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 8 },
  title: { fontSize: theme.font.title, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.muted, marginTop: 6, lineHeight: 20, marginBottom: 16 },
  captureBtns: { flexDirection: 'row', gap: 10 },
  previewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 12,
    ...theme.shadow.card,
  },
  previewImg: { width: '100%', height: 320, borderRadius: theme.radius.md },
  noteInput: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.text,
    marginTop: 12,
  },
  previewBtns: { flexDirection: 'row', gap: 10, marginTop: 12 },
  histLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 28,
    marginBottom: 4,
  },
  entry: {
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    ...theme.shadow.card,
  },
  entryImg: { width: '100%', height: 360 },
  entryMeta: { padding: 14 },
  entryDate: { fontSize: 15, fontWeight: '700', color: theme.colors.text, textTransform: 'capitalize' },
  entryNote: { fontSize: 14, color: theme.colors.muted, marginTop: 4, lineHeight: 20 },
  entryRemove: { fontSize: 13, color: theme.colors.danger, fontWeight: '600', marginTop: 8 },
  zoomBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: theme.colors.overlay,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  zoomBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  viewer: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  viewerHint: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  viewerClose: {
    position: 'absolute',
    top: 44,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerCloseText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8, marginTop: 10 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  emptyText: { fontSize: 14, color: theme.colors.muted, textAlign: 'center', lineHeight: 20 },
});
