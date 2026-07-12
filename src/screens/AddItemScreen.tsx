// Tela de cadastro/edição de peça + importação em massa da galeria.

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { theme } from '../theme';
import {
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
  COLORS,
  Category,
  ClothingItem,
  SUGGESTED_TAGS,
} from '../types';
import { Chip, LevelPicker, PrimaryButton, Swatch } from '../components/ui';
import { useWardrobe } from '../store';
import { persistImage } from '../images';
import { pickImage, pickImages } from '../imagePicker';
import { uploadImage, isDataUrl } from '../cloudStorage';
import { loadApiKey, saveApiKey } from '../storage';
import { detectGarment } from '../detect';

const CATEGORIES: Category[] = ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory'];

export function AddItemScreen({
  editId,
  onDone,
}: {
  editId?: string | null;
  onDone: () => void;
}) {
  const { addItem, addItems, updateItem, items } = useWardrobe();
  const editing = editId ? items.find((i) => i.id === editId) ?? null : null;

  const [imageUri, setImageUri] = useState<string>(editing?.imageUri ?? '');
  const [imageChanged, setImageChanged] = useState(false);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/jpeg');
  const [name, setName] = useState(editing?.name ?? '');
  const [category, setCategory] = useState<Category>(editing?.category ?? 'top');
  const [colorId, setColorId] = useState<string>(editing?.colorId ?? 'preto');
  const [warmth, setWarmth] = useState(editing?.warmth ?? 3);
  const [formality, setFormality] = useState(editing?.formality ?? 3);
  const [rainproof, setRainproof] = useState(editing?.rainproof ?? false);
  const [tags, setTags] = useState<string[]>(editing ? editing.tags : []);
  const [customTag, setCustomTag] = useState('');

  // IA: chave de API e estado de detecção
  const [apiKey, setApiKey] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    loadApiKey().then(setApiKey);
  }, []);

  // Deixa a imagem pronta para guardar: data URL → sobe pro Storage (URL leve).
  async function toStoredUri(uri: string): Promise<string> {
    if (!uri) return '';
    if (isDataUrl(uri)) return await uploadImage(uri);
    if (uri.startsWith('http')) return uri;
    return await persistImage(uri);
  }

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function addCustomTag() {
    const t = customTag.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setCustomTag('');
  }

  // união das sugestões + tags personalizadas já selecionadas, sem repetir
  const allTags = Array.from(new Set([...SUGGESTED_TAGS, ...tags]));

  // Guarda a imagem escolhida (data URL pronto) e extrai base64/mime p/ a IA.
  function applyPicked(uri: string) {
    setImageUri(uri);
    if (uri.startsWith('data:')) {
      const comma = uri.indexOf(',');
      setImageBase64(uri.slice(comma + 1));
      setImageMime(uri.slice(5, uri.indexOf(';')) || 'image/jpeg');
    } else {
      setImageBase64(null);
      setImageMime('image/jpeg');
    }
    setImageChanged(true);
  }

  async function pickFromGallery() {
    const uri = await pickImage(false);
    if (uri === 'denied') {
      Alert.alert('Permissão necessária', 'Autorize o acesso à galeria para escolher uma foto.');
      return;
    }
    if (uri) applyPicked(uri);
  }

  async function takePhoto() {
    const uri = await pickImage(true);
    if (uri === 'denied') {
      Alert.alert('Permissão necessária', 'Autorize o acesso à câmera para tirar uma foto.');
      return;
    }
    if (uri) applyPicked(uri);
  }

  // ---- Detecção por IA (categoria + cor) ----
  function onDetectPress() {
    if (!imageUri) {
      Alert.alert('Escolha uma foto', 'Adicione a foto da peça primeiro.');
      return;
    }
    if (!apiKey) {
      setShowKeyInput(true);
      return;
    }
    runDetection();
  }

  async function saveKey() {
    const k = keyInput.trim();
    if (!k) return;
    await saveApiKey(k);
    setApiKey(k);
    setShowKeyInput(false);
    setKeyInput('');
    runDetection(k);
  }

  async function runDetection(keyOverride?: string) {
    const key = keyOverride ?? apiKey;
    if (!imageBase64) {
      Alert.alert(
        'Refaça a foto',
        'Para detectar, escolha ou tire a foto novamente (preciso da imagem recém-selecionada).',
      );
      return;
    }
    setDetecting(true);
    try {
      const result = await detectGarment(imageBase64, imageMime, key);
      if (result.category) setCategory(result.category);
      if (result.colorId) setColorId(result.colorId);
      if (!result.category && !result.colorId) {
        Alert.alert('Não consegui identificar', `Resposta da IA: ${result.raw.slice(0, 120)}`);
      }
    } catch (e: any) {
      Alert.alert('Falha na detecção', e?.message ?? 'Tente novamente.');
    } finally {
      setDetecting(false);
    }
  }

  // Importação em massa: várias fotos da galeria viram peças (com defaults
  // para o usuário ajustar depois). As imagens já são salvas de forma permanente.
  async function importMany() {
    const uris = await pickImages();
    if (!uris.length) return;
    setSaveError(null);
    setSaving(true);
    try {
      // Sobe cada foto pro Storage; mantém as que deram certo.
      const stored = await Promise.all(
        uris.map(async (uri) => {
          try {
            return await toStoredUri(uri);
          } catch {
            return null;
          }
        }),
      );
      const ok = stored.filter((u): u is string => !!u);
      const datas: Omit<ClothingItem, 'id' | 'createdAt' | 'wearCount'>[] = ok.map((uri) => ({
        imageUri: uri,
        name: 'Nova peça',
        category: 'top' as Category,
        colorId: 'preto',
        warmth: 3,
        formality: 3,
        rainproof: false,
        tags: [],
      }));
      if (datas.length) addItems(datas);
      if (ok.length < uris.length) {
        setSaveError(`Enviei ${ok.length} de ${uris.length}. Algumas falharam — tente as que faltaram de novo.`);
      } else {
        onDone();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (saving) return;
    const finalName = name.trim() || CATEGORY_LABELS[category];
    setSaveError(null);
    setSaving(true);
    try {
      if (editing) {
        const savedUri = imageChanged
          ? await toStoredUri(imageUri)
          : editing.imageUri;
        updateItem(editing.id, {
          imageUri: savedUri,
          name: finalName,
          category,
          colorId,
          warmth,
          formality,
          rainproof,
          tags,
        });
        onDone();
        return;
      }

      const savedUri = await toStoredUri(imageUri);
      addItem({
        imageUri: savedUri,
        name: finalName,
        category,
        colorId,
        warmth,
        formality,
        rainproof,
        tags,
      });
      onDone();
    } catch (e) {
      setSaveError(
        'Não consegui enviar a foto pra nuvem. Verifique a internet e tente de novo.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{editing ? 'Editar peça' : 'Nova peça'}</Text>

      {/* Importação em massa (só no modo adicionar) */}
      {!editing && (
        <Pressable style={styles.importCard} onPress={importMany}>
          <Text style={styles.importEmoji}>🖼️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.importTitle}>Importar várias da galeria</Text>
            <Text style={styles.importSub}>
              Selecione muitas fotos de uma vez — você ajusta os detalhes depois.
            </Text>
          </View>
          <Text style={styles.importArrow}>›</Text>
        </Pressable>
      )}

      {/* Foto */}
      <Pressable style={styles.photoBox} onPress={pickFromGallery}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoEmoji}>{CATEGORY_EMOJI[category]}</Text>
            <Text style={styles.photoHint}>Toque para escolher da galeria</Text>
          </View>
        )}
      </Pressable>
      <View style={styles.photoBtns}>
        <PrimaryButton label="📷 Câmera" variant="outline" onPress={takePhoto} style={{ flex: 1 }} />
        <PrimaryButton label="🖼️ Galeria" variant="outline" onPress={pickFromGallery} style={{ flex: 1 }} />
      </View>

      {/* Detecção por IA */}
      {imageUri ? (
        <Pressable style={styles.detectBtn} onPress={onDetectPress} disabled={detecting}>
          {detecting ? (
            <ActivityIndicator color={theme.colors.accent} />
          ) : (
            <Text style={styles.detectText}>✨ Detectar categoria e cor com IA</Text>
          )}
        </Pressable>
      ) : null}

      {showKeyInput && (
        <View style={styles.keyBox}>
          <Text style={styles.keyTitle}>Configurar a IA (uma vez só)</Text>
          <Text style={styles.keyHelp}>
            Cole sua chave da Anthropic (começa com "sk-ant-"). Crie em console.anthropic.com →
            API Keys. Ela fica salva só neste aparelho.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="sk-ant-..."
            placeholderTextColor={theme.colors.muted}
            value={keyInput}
            onChangeText={setKeyInput}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
          <PrimaryButton label="Salvar e detectar" onPress={saveKey} style={{ marginTop: 10 }} />
        </View>
      )}

      {/* Nome */}
      <Text style={styles.label}>Nome (opcional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Camiseta branca básica"
        placeholderTextColor={theme.colors.muted}
        value={name}
        onChangeText={setName}
      />

      {/* Categoria */}
      <Text style={styles.label}>Categoria</Text>
      <View style={styles.wrapRow}>
        {CATEGORIES.map((c) => (
          <Chip
            key={c}
            label={`${CATEGORY_EMOJI[c]} ${CATEGORY_LABELS[c]}`}
            active={category === c}
            onPress={() => setCategory(c)}
          />
        ))}
      </View>

      {/* Cor */}
      <Text style={styles.label}>Cor predominante</Text>
      <View style={styles.wrapRow}>
        {COLORS.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => setColorId(c.id)}
            style={[styles.colorChip, colorId === c.id && styles.colorChipActive]}
          >
            <Swatch hex={c.hex} size={18} />
            <Text style={styles.colorChipLabel}>{c.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Agasalho */}
      <Text style={styles.label}>Quão quente é a peça?</Text>
      <LevelPicker value={warmth} onChange={setWarmth} leftLabel="Leve" rightLabel="Quente" />

      {/* Formalidade */}
      <Text style={styles.label}>Nível de formalidade</Text>
      <LevelPicker value={formality} onChange={setFormality} leftLabel="Casual" rightLabel="Formal" />

      {/* Chuva */}
      <Pressable style={styles.switchRow} onPress={() => setRainproof((v) => !v)}>
        <View style={[styles.checkbox, rainproof && styles.checkboxOn]}>
          {rainproof && <Text style={styles.check}>✓</Text>}
        </View>
        <Text style={styles.switchLabel}>Serve para dias de chuva</Text>
      </Pressable>

      {/* Tags */}
      <Text style={styles.label}>Tags</Text>
      <View style={styles.wrapRow}>
        {allTags.map((t) => (
          <Chip key={t} label={t} active={tags.includes(t)} onPress={() => toggleTag(t)} />
        ))}
      </View>
      <View style={styles.customTagRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Criar tag personalizada"
          placeholderTextColor={theme.colors.muted}
          value={customTag}
          onChangeText={setCustomTag}
          autoCapitalize="none"
          onSubmitEditing={addCustomTag}
          returnKeyType="done"
        />
        <PrimaryButton label="+ Add" variant="outline" onPress={addCustomTag} />
      </View>

      {saveError && <Text style={styles.saveError}>⚠️ {saveError}</Text>}
      <PrimaryButton
        label={saving ? 'Enviando foto…' : editing ? 'Salvar alterações' : 'Salvar peça'}
        onPress={handleSave}
        style={{ marginTop: 20 }}
      />
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 20 },
  saveError: {
    fontSize: theme.font.small,
    color: theme.colors.danger,
    marginTop: 16,
    textAlign: 'center',
  },
  title: { fontSize: theme.font.title, fontWeight: '700', color: theme.colors.text, marginBottom: 16 },
  importCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.md,
    padding: 14,
    marginBottom: 16,
  },
  importEmoji: { fontSize: 28 },
  importTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  importSub: { fontSize: 12, color: theme.colors.muted, marginTop: 2, lineHeight: 16 },
  importArrow: { fontSize: 24, color: theme.colors.accent, fontWeight: '700' },
  photoBox: {
    height: 260,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceAlt,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  photoEmoji: { fontSize: 64 },
  photoHint: { color: theme.colors.muted, fontSize: 14 },
  photoBtns: { flexDirection: 'row', gap: 10, marginTop: 10 },
  detectBtn: {
    marginTop: 10,
    height: 48,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detectText: { color: theme.colors.accent, fontWeight: '700', fontSize: 14 },
  keyBox: {
    marginTop: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },
  keyTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  keyHelp: { fontSize: 12, color: theme.colors.muted, marginTop: 4, marginBottom: 10, lineHeight: 17 },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 22,
    marginBottom: 10,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.text,
  },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  customTagRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  colorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  colorChipActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
  colorChipLabel: { fontSize: 13, color: theme.colors.text },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 22 },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  checkboxOn: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  check: { color: '#fff', fontWeight: '700' },
  switchLabel: { fontSize: 15, color: theme.colors.text },
});
