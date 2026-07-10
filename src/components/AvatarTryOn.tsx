// Modal "Provador": usa uma FOTO real do usuário como avatar e mostra o look
// escolhido junto (as peças que compõem a combinação). A foto fica salva na
// conta (sincroniza entre aparelhos).

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../theme';
import { useWardrobe } from '../store';
import { Outfit, outfitPieces } from '../types';
import { persistImage } from '../images';
import { ItemThumb } from './ItemThumb';

// Na web, o expo-image-picker é instável (às vezes não resolve a escolha).
// Usamos um <input type="file"> nativo do navegador — devolve a foto como
// data URL direto (confiável e sem depender de fetch de blob).
function pickImageWeb(capture?: 'user' | 'environment'): Promise<string | null> {
  return new Promise((resolve) => {
    const doc: any = (globalThis as any).document;
    if (!doc) return resolve(null);
    const input = doc.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (capture) input.capture = capture;
    input.style.position = 'fixed';
    input.style.left = '-10000px';
    let settled = false;
    const finish = (val: string | null) => {
      if (settled) return;
      settled = true;
      try {
        doc.body.removeChild(input);
      } catch {}
      resolve(val);
    };
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) return finish(null);
      const reader = new (globalThis as any).FileReader();
      reader.onload = () => finish(reader.result as string);
      reader.onerror = () => finish(null);
      reader.readAsDataURL(file);
    };
    // Cancelamento: navegadores modernos disparam 'cancel'; como reforço,
    // ao voltar o foco pra janela sem arquivo, encerramos.
    input.oncancel = () => finish(null);
    const onFocus = () => {
      setTimeout(() => {
        if (!input.files || !input.files.length) finish(null);
      }, 800);
      (globalThis as any).removeEventListener?.('focus', onFocus);
    };
    (globalThis as any).addEventListener?.('focus', onFocus);
    doc.body.appendChild(input);
    input.click();
  });
}

export function AvatarTryOn({
  visible,
  outfit,
  title = 'Provador',
  onClose,
}: {
  visible: boolean;
  outfit: Outfit;
  title?: string;
  onClose: () => void;
}) {
  const { avatar, updateAvatar } = useWardrobe();
  const [busy, setBusy] = useState(false);
  const photo = avatar.photoUri;
  const pieces = outfitPieces(outfit);

  async function addPhoto(fromCamera: boolean) {
    try {
      let dataUrl: string | null = null;

      if (Platform.OS === 'web') {
        dataUrl = await pickImageWeb(fromCamera ? 'user' : undefined);
        if (!dataUrl) return; // cancelou
        setBusy(true);
      } else {
        const perm = fromCamera
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(
            'Permissão necessária',
            fromCamera
              ? 'Autorize o acesso à câmera para tirar uma foto.'
              : 'Autorize o acesso à galeria para escolher uma foto.',
          );
          return;
        }
        const opts = { quality: 0.7, allowsEditing: true, aspect: [3, 4] as [number, number], base64: true };
        const res = fromCamera
          ? await ImagePicker.launchCameraAsync(opts)
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], ...opts });
        if (res.canceled || !res.assets?.[0]) return;
        setBusy(true);
        const a = res.assets[0];
        dataUrl = a.base64
          ? `data:${a.mimeType ?? 'image/jpeg'};base64,${a.base64}`
          : await persistImage(a.uri);
      }

      updateAvatar({ photoUri: dataUrl });
    } catch (e) {
      Alert.alert('Ops', 'Não consegui usar essa foto. Tente outra.');
    } finally {
      setBusy(false);
    }
  }

  function removePhoto() {
    updateAvatar({ photoUri: undefined });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.colors.text} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingBottom: 28, alignItems: 'center' }}
            showsVerticalScrollIndicator={false}
          >
            {photo ? (
              <>
                <View style={styles.photoWrap}>
                  <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
                  {busy && (
                    <View style={styles.photoBusy}>
                      <ActivityIndicator color="#FFF" />
                    </View>
                  )}
                </View>

                <Text style={styles.lookLabel}>
                  {pieces.length ? 'Seu look' : 'Escolha um look para combinar'}
                </Text>
                {pieces.length > 0 ? (
                  <View style={styles.pieces}>
                    {pieces.map((p) => (
                      <View key={p.id} style={styles.pieceItem}>
                        <ItemThumb item={p} style={styles.pieceThumb} rounded={theme.radius.sm} />
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.hint}>
                    Volte e escolha (ou monte) um look para ver a combinação aqui. ✨
                  </Text>
                )}

                <View style={styles.actions}>
                  <Pressable style={styles.outlineBtn} onPress={() => addPhoto(false)} disabled={busy}>
                    <Ionicons name="image-outline" size={16} color={theme.colors.accent} />
                    <Text style={styles.outlineBtnText}>Trocar foto</Text>
                  </Pressable>
                  <Pressable style={styles.outlineBtn} onPress={() => addPhoto(true)} disabled={busy}>
                    <Ionicons name="camera-outline" size={16} color={theme.colors.accent} />
                    <Text style={styles.outlineBtnText}>Câmera</Text>
                  </Pressable>
                </View>
                <Pressable onPress={removePhoto} hitSlop={8} style={styles.removeBtn}>
                  <Text style={styles.removeText}>Remover foto</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.placeholder}>
                  {busy ? (
                    <ActivityIndicator color={theme.colors.accent} />
                  ) : (
                    <Ionicons name="person-outline" size={54} color={theme.colors.muted} />
                  )}
                </View>
                <Text style={styles.emptyTitle}>Crie seu avatar com a sua foto</Text>
                <Text style={styles.hint}>
                  Envie uma foto sua de corpo inteiro (de preferência em pé, fundo limpo). Ela vira
                  seu avatar no provador — e fica salva na sua conta.
                </Text>
                <View style={styles.actions}>
                  <Pressable style={styles.solidBtn} onPress={() => addPhoto(true)} disabled={busy}>
                    <Ionicons name="camera" size={18} color="#FFF" />
                    <Text style={styles.solidBtnText}>Tirar foto</Text>
                  </Pressable>
                  <Pressable style={styles.solidBtn} onPress={() => addPhoto(false)} disabled={busy}>
                    <Ionicons name="image" size={18} color="#FFF" />
                    <Text style={styles.solidBtnText}>Galeria</Text>
                  </Pressable>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.bg,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingHorizontal: 20,
    paddingTop: 14,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: { fontSize: theme.font.h2, fontWeight: '800', color: theme.colors.text },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoWrap: {
    width: 240,
    aspectRatio: 3 / 4,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    marginTop: 8,
    backgroundColor: theme.colors.surfaceAlt,
    ...theme.shadow.card,
  },
  photo: { width: '100%', height: '100%' },
  photoBusy: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lookLabel: {
    fontSize: theme.font.body,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: 20,
    marginBottom: 12,
    alignSelf: 'stretch',
    paddingHorizontal: 4,
  },
  pieces: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  pieceItem: {},
  pieceThumb: { width: 74, height: 92 },
  hint: {
    fontSize: theme.font.small,
    color: theme.colors.muted,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  placeholder: {
    width: 150,
    height: 190,
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    backgroundColor: theme.colors.surface,
  },
  emptyTitle: {
    fontSize: theme.font.h2,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: 18,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  solidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.accent,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: theme.radius.pill,
    ...theme.shadow.accent,
  },
  solidBtnText: { color: '#FFF', fontWeight: '800', fontSize: theme.font.body },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.accentSoft,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: theme.radius.pill,
  },
  outlineBtnText: { color: theme.colors.accent, fontWeight: '700', fontSize: theme.font.small },
  removeBtn: { marginTop: 14 },
  removeText: { color: theme.colors.muted, fontSize: theme.font.small, fontWeight: '600' },
});
