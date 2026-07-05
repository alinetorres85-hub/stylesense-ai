// Persistência de imagens das peças.
//
// Nativo: copia a foto (que vem em cache volátil) para uma pasta PERMANENTE do
// app (documentDirectory), retornando um file:// estável.
// Web: converte a imagem em data URL (string), que é guardada junto dos dados
// no IndexedDB — assim a foto sobrevive a reloads no navegador.

import { Platform } from 'react-native';

const FOLDER = 'wardrobe';

function blobToDataUrl(blob: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new (globalThis as any).FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function persistImage(sourceUri: string): Promise<string> {
  if (!sourceUri) return sourceUri;

  if (Platform.OS === 'web') {
    try {
      const res = await fetch(sourceUri);
      const blob = await res.blob();
      return await blobToDataUrl(blob);
    } catch (e) {
      console.warn('persistImage (web) falhou; mantendo URI original', e);
      return sourceUri;
    }
  }

  try {
    const { Directory, File, Paths } = require('expo-file-system');
    const dir = new Directory(Paths.document, FOLDER);
    if (!dir.exists) dir.create({ intermediates: true });

    const clean = sourceUri.split('?')[0];
    const ext = clean.includes('.') ? clean.split('.').pop() : 'jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const dest = new File(dir, filename);
    new File(sourceUri).copy(dest);
    return dest.uri;
  } catch (e) {
    console.warn('persistImage falhou; mantendo URI original', e);
    return sourceUri;
  }
}

// Apaga (best-effort) o arquivo de imagem ao excluir uma peça (só no nativo;
// na web a imagem é uma string dentro dos dados e some junto com o registro).
export function deleteImageSafe(uri?: string): void {
  if (!uri || Platform.OS === 'web') return;
  try {
    const { File } = require('expo-file-system');
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // silencioso — limpeza é best-effort
  }
}
