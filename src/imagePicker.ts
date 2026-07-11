// Seletor de imagem confiável em web e nativo, devolvendo sempre uma imagem
// PRONTA para guardar (data URL, redimensionada). Na web o expo-image-picker é
// instável — usamos um <input type="file"> nativo do navegador.

import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// Web: abre o seletor de arquivo e devolve o data URL cru (sem redimensionar).
function pickFileWeb(capture?: 'user' | 'environment', multiple = false): Promise<string[]> {
  return new Promise((resolve) => {
    const doc: any = (globalThis as any).document;
    if (!doc) return resolve([]);
    const input = doc.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (capture) input.capture = capture;
    if (multiple) input.multiple = true;
    input.style.position = 'fixed';
    input.style.left = '-10000px';
    let settled = false;
    const finish = (v: string[]) => {
      if (settled) return;
      settled = true;
      try {
        doc.body.removeChild(input);
      } catch {}
      resolve(v);
    };
    input.onchange = async () => {
      const files: any[] = input.files ? Array.from(input.files) : [];
      if (!files.length) return finish([]);
      const urls = await Promise.all(
        files.map(
          (f) =>
            new Promise<string | null>((res) => {
              const r = new (globalThis as any).FileReader();
              r.onload = () => res(r.result as string);
              r.onerror = () => res(null);
              r.readAsDataURL(f);
            }),
        ),
      );
      finish(urls.filter((u): u is string => !!u));
    };
    input.oncancel = () => finish([]);
    doc.body.appendChild(input);
    input.click();
  });
}

// Redimensiona/comprime (só web, só data URL). Máx. `maxDim`px, JPEG.
export async function shrinkImage(uri: string, maxDim = 1000, quality = 0.8): Promise<string> {
  if (Platform.OS !== 'web' || !uri.startsWith('data:')) return uri;
  try {
    const g: any = globalThis as any;
    const img: any = await new Promise((res, rej) => {
      const i = new g.Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = uri;
    });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const c = g.document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    return c.toDataURL('image/jpeg', quality);
  } catch {
    return uri;
  }
}

// 'denied' = permissão negada (nativo). null = cancelou. string = imagem pronta.
export async function pickImage(fromCamera = false): Promise<string | null | 'denied'> {
  if (Platform.OS === 'web') {
    const [raw] = await pickFileWeb(fromCamera ? 'environment' : undefined);
    if (!raw) return null;
    return await shrinkImage(raw);
  }
  const perm = fromCamera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return 'denied';
  const opts = { quality: 0.6, allowsEditing: true, aspect: [3, 4] as [number, number], base64: true };
  const res = fromCamera
    ? await ImagePicker.launchCameraAsync(opts)
    : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], ...opts });
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  return a.base64 ? `data:${a.mimeType ?? 'image/jpeg'};base64,${a.base64}` : a.uri;
}

// Seleção múltipla (importação em massa). Devolve lista de imagens prontas.
export async function pickImages(): Promise<string[]> {
  if (Platform.OS === 'web') {
    const raws = await pickFileWeb(undefined, true);
    return Promise.all(raws.map((r) => shrinkImage(r)));
  }
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return [];
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: 0,
    quality: 0.6,
    base64: true,
  });
  if (res.canceled || !res.assets?.length) return [];
  return res.assets.map((a) =>
    a.base64 ? `data:${a.mimeType ?? 'image/jpeg'};base64,${a.base64}` : a.uri,
  );
}
