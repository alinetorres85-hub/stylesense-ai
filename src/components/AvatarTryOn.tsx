// Modal "Provador": usa uma FOTO real do usuário como avatar e permite MONTAR
// o look ali dentro (escolher peças do closet por slot) e ver a combinação
// junto da foto. A foto fica sempre visível; o seletor de peças aparece abaixo.

import React, { useEffect, useState } from 'react';
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
import { CATEGORY_LABELS, Category, ClothingItem, Outfit, OutfitSlot } from '../types';
import { persistImage } from '../images';
import { supabase } from '../supabaseClient';
import { ItemThumb } from './ItemThumb';

// Reduz a imagem (na web) antes de mandar pra IA: evita estourar o limite de
// tamanho da requisição e deixa a geração mais rápida. Máx. 1024px, JPEG.
async function shrink(uri: string): Promise<string> {
  if (Platform.OS !== 'web' || !uri.startsWith('data:')) return uri;
  try {
    const g: any = globalThis as any;
    const img: any = await new Promise((res, rej) => {
      const i = new g.Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = uri;
    });
    const maxDim = 1024;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = g.document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch {
    return uri;
  }
}

const SLOTS: { key: OutfitSlot; label: string; icon: any }[] = [
  { key: 'top', label: 'Parte de cima', icon: 'shirt-outline' },
  { key: 'bottom', label: 'Parte de baixo', icon: 'grid-outline' },
  { key: 'dress', label: 'Vestido', icon: 'woman-outline' },
  { key: 'outerwear', label: 'Casaco', icon: 'snow-outline' },
  { key: 'shoes', label: 'Calçado', icon: 'footsteps-outline' },
  { key: 'accessory', label: 'Acessório', icon: 'bag-handle-outline' },
];

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
  const { avatar, updateAvatar, items } = useWardrobe();
  const [busy, setBusy] = useState(false);
  const [tryOutfit, setTryOutfit] = useState<Outfit>(outfit);
  const [pickerCat, setPickerCat] = useState<Category | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const photo = avatar.photoUri;

  // Ao abrir, começa do look recebido (sugestão/look salvo) e deixa editar.
  useEffect(() => {
    if (visible) {
      setTryOutfit(outfit);
      setPickerCat(null);
      setAiResult(null);
      setAiError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Peça que a IA veste: prioriza vestido, senão a parte de cima.
  const aiGarment = tryOutfit.dress ?? tryOutfit.top;

  async function generateAI() {
    if (!photo) return;
    if (!aiGarment) {
      Alert.alert(
        'Escolha uma peça primeiro',
        'Toque no slot "Parte de cima" (ou "Vestido") e escolha uma peça. A IA veste essa peça em você.',
      );
      return;
    }
    setAiBusy(true);
    setAiError(null);
    try {
      const [human, garment] = await Promise.all([shrink(photo), shrink(aiGarment.imageUri)]);
      const { data, error } = await supabase.functions.invoke('tryon', {
        body: { human, garment },
      });
      if (error) {
        let msg = 'Não consegui gerar. Tente de novo.';
        try {
          const j = await (error as any).context?.json();
          if (j?.error) msg = j.error;
        } catch {}
        setAiError(msg);
      } else if (data?.url) {
        setAiResult(data.url as string);
      } else {
        setAiError(data?.error ?? 'A IA não retornou imagem.');
      }
    } catch (e) {
      setAiError('Falha de conexão. Tente de novo.');
    } finally {
      setAiBusy(false);
    }
  }

  async function addPhoto(fromCamera: boolean) {
    try {
      let dataUrl: string | null = null;
      if (Platform.OS === 'web') {
        dataUrl = await pickImageWeb(fromCamera ? 'user' : undefined);
        if (!dataUrl) return;
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

  function pickPiece(item: ClothingItem | null) {
    if (!pickerCat) return;
    setTryOutfit((o) => ({ ...o, [pickerCat]: item ?? undefined }));
    setPickerCat(null);
  }

  const hasClothes = items.length > 0;
  const catItems = pickerCat ? items.filter((i) => i.category === pickerCat) : [];

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
            style={{ flexShrink: 1 }}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {!photo ? (
              <View style={{ alignItems: 'center' }}>
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
                  seu avatar — depois você prova as peças do seu closet aqui.
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
              </View>
            ) : aiResult ? (
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.lookLabel}>✨ Você com essa peça</Text>
                <Image source={{ uri: aiResult }} style={styles.resultImg} resizeMode="cover" />
                <Text style={styles.hint}>
                  Gerado por IA — a qualidade varia. Se sair estranho, tente outra foto ou peça.
                </Text>
                <Pressable style={styles.aiBtn} onPress={() => setAiResult(null)}>
                  <Ionicons name="refresh" size={18} color="#FFF" />
                  <Text style={styles.aiBtnText}>Provar outra</Text>
                </Pressable>
              </View>
            ) : aiBusy ? (
              <View style={styles.aiLoading}>
                <ActivityIndicator size="large" color={theme.colors.accent} />
                <Text style={styles.aiLoadingText}>Vestindo a peça em você…</Text>
                <Text style={styles.hint}>Isso leva uns 10–20 segundos ✨</Text>
              </View>
            ) : (
              <>
                {/* Foto sempre visível */}
                <View style={styles.photoRow}>
                  <View style={styles.photoWrap}>
                    <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
                    {busy && (
                      <View style={styles.photoBusy}>
                        <ActivityIndicator color="#FFF" />
                      </View>
                    )}
                  </View>
                  <View style={styles.photoSide}>
                    <Pressable style={styles.sideBtn} onPress={() => addPhoto(false)} disabled={busy}>
                      <Ionicons name="image-outline" size={15} color={theme.colors.accent} />
                      <Text style={styles.sideBtnText}>Trocar</Text>
                    </Pressable>
                    <Pressable style={styles.sideBtn} onPress={() => addPhoto(true)} disabled={busy}>
                      <Ionicons name="camera-outline" size={15} color={theme.colors.accent} />
                      <Text style={styles.sideBtnText}>Câmera</Text>
                    </Pressable>
                    <Pressable style={styles.sideBtnGhost} onPress={removePhoto} hitSlop={6}>
                      <Text style={styles.sideBtnGhostText}>Remover foto</Text>
                    </Pressable>
                  </View>
                </View>

                {!hasClothes ? (
                  <Text style={styles.hint}>
                    Cadastre roupas no seu Closet (aba Novo) para montar e provar o look aqui. ✨
                  </Text>
                ) : pickerCat ? (
                  // Seletor de peça (inline, abaixo da foto)
                  <View>
                    <View style={styles.pickerHeader}>
                      <Pressable style={styles.backBtn} onPress={() => setPickerCat(null)}>
                        <Ionicons name="chevron-back" size={20} color={theme.colors.accent} />
                        <Text style={styles.backText}>Voltar</Text>
                      </Pressable>
                      <Text style={styles.pickerTitle}>{CATEGORY_LABELS[pickerCat]}</Text>
                    </View>
                    {catItems.length === 0 ? (
                      <Text style={styles.hint}>
                        Nenhuma peça dessa categoria. Cadastre na aba Novo.
                      </Text>
                    ) : (
                      <View style={styles.grid}>
                        {catItems.map((it) => {
                          const active = tryOutfit[pickerCat]?.id === it.id;
                          return (
                            <View key={it.id} style={styles.gridCell}>
                              <ItemThumb
                                item={it}
                                style={[styles.gridImg, active && styles.gridImgActive]}
                                rounded={theme.radius.sm}
                              />
                              <Text style={styles.gridName} numberOfLines={1}>
                                {it.name}
                              </Text>
                              <Pressable
                                style={StyleSheet.absoluteFill}
                                onPress={() => pickPiece(it)}
                              />
                            </View>
                          );
                        })}
                      </View>
                    )}
                    {tryOutfit[pickerCat] && (
                      <Pressable style={styles.removePieceBtn} onPress={() => pickPiece(null)}>
                        <Text style={styles.removePieceText}>Remover do look</Text>
                      </Pressable>
                    )}
                  </View>
                ) : (
                  // Slots do look (toque para escolher cada peça)
                  <>
                    <Text style={styles.lookLabel}>Prove as peças</Text>
                    <View style={styles.slots}>
                      {SLOTS.map((s) => {
                        const it = tryOutfit[s.key];
                        return (
                          <View key={s.key} style={styles.slot}>
                            {it ? (
                              <ItemThumb
                                item={it}
                                style={styles.slotThumb}
                                rounded={theme.radius.sm}
                              />
                            ) : (
                              <View style={styles.slotEmpty}>
                                <Ionicons name={s.icon} size={22} color={theme.colors.muted} />
                                <Ionicons
                                  name="add-circle"
                                  size={18}
                                  color={theme.colors.accent}
                                  style={styles.slotAdd}
                                />
                              </View>
                            )}
                            <Text style={styles.slotLabel}>{s.label}</Text>
                            <Text style={styles.slotName} numberOfLines={1}>
                              {it ? it.name : 'toque para escolher'}
                            </Text>
                            {/* Toque por cima de tudo (fica acima da imagem, que na
                                web captura o clique) — garante o onPress. */}
                            <Pressable
                              style={StyleSheet.absoluteFill}
                              onPress={() => setPickerCat(s.key as Category)}
                            />
                          </View>
                        );
                      })}
                    </View>
                  </>
                )}
              </>
            )}
          </ScrollView>

          {/* Rodapé fixo: botão "Provar com IA" sempre visível (slots ou seletor). */}
          {photo && hasClothes && !aiBusy && !aiResult && (
            <View style={styles.footer}>
              {aiError && <Text style={styles.aiError}>⚠️ {aiError}</Text>}
              <Pressable style={styles.aiBtn} onPress={generateAI}>
                <Ionicons name="sparkles" size={18} color="#FFF" />
                <Text style={styles.aiBtnText}>Provar com IA</Text>
              </Pressable>
              <Text style={styles.aiHint}>
                {aiGarment
                  ? `A IA veste "${(tryOutfit.dress ?? tryOutfit.top)!.name}" em você — ~15s, 1 crédito.`
                  : 'Escolha uma "Parte de cima" ou "Vestido" — é o que a IA veste em você.'}
              </Text>
            </View>
          )}
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
  photoRow: { flexDirection: 'row', gap: 14, marginTop: 8 },
  photoWrap: {
    width: 170,
    aspectRatio: 3 / 4,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
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
  photoSide: { flex: 1, justifyContent: 'center', gap: 10 },
  sideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.accentSoft,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
    alignSelf: 'flex-start',
  },
  sideBtnText: { color: theme.colors.accent, fontWeight: '700', fontSize: theme.font.small },
  sideBtnGhost: { paddingVertical: 4, alignSelf: 'flex-start' },
  sideBtnGhostText: { color: theme.colors.muted, fontSize: theme.font.small, fontWeight: '600' },
  lookLabel: {
    fontSize: theme.font.body,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: 22,
    marginBottom: 12,
  },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  slot: {
    width: '47%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 10,
    ...theme.shadow.card,
  },
  slotThumb: { width: '100%', height: 110 },
  slotEmpty: {
    width: '100%',
    height: 110,
    borderRadius: theme.radius.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bg,
  },
  slotAdd: { position: 'absolute', bottom: 8, right: 8 },
  slotLabel: {
    fontSize: theme.font.small,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 8,
  },
  slotName: { fontSize: theme.font.tiny, color: theme.colors.muted, marginTop: 1 },
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
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    marginBottom: 14,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: theme.colors.accentSoft,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
  },
  backText: { color: theme.colors.accent, fontWeight: '700', fontSize: theme.font.small },
  pickerTitle: { fontSize: theme.font.body, fontWeight: '800', color: theme.colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCell: { width: '30%' },
  gridImg: { width: '100%', height: 104 },
  gridImgActive: { borderWidth: 2.5, borderColor: theme.colors.accent },
  gridName: { fontSize: theme.font.tiny, color: theme.colors.text, marginTop: 4 },
  removePieceBtn: {
    marginTop: 16,
    height: 46,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePieceText: { color: theme.colors.danger, fontWeight: '700', fontSize: theme.font.small },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20, justifyContent: 'center' },
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
  footer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 12,
    paddingBottom: 6,
  },
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.accent,
    paddingVertical: 15,
    borderRadius: theme.radius.pill,
    marginTop: 12,
    ...theme.shadow.accent,
  },
  aiBtnDisabled: { backgroundColor: theme.colors.muted, opacity: 0.5 },
  aiBtnText: { color: '#FFF', fontWeight: '800', fontSize: theme.font.body },
  aiHint: {
    fontSize: theme.font.tiny,
    color: theme.colors.muted,
    textAlign: 'center',
    marginTop: 8,
  },
  aiError: {
    fontSize: theme.font.small,
    color: theme.colors.danger,
    textAlign: 'center',
    marginTop: 16,
  },
  aiLoading: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  aiLoadingText: {
    fontSize: theme.font.body,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: 6,
  },
  resultImg: {
    width: 260,
    aspectRatio: 3 / 4,
    borderRadius: theme.radius.lg,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: theme.colors.surfaceAlt,
    ...theme.shadow.card,
  },
});
