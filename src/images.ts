// Persistência de imagens das peças.
//
// O seletor de imagens devolve a foto numa pasta de CACHE volátil (que o
// sistema/Expo Go pode apagar). Aqui copiamos a foto para uma pasta
// PERMANENTE do app (documentDirectory), para a imagem sobreviver a limpezas
// de cache e reloads.

import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';

const FOLDER = 'wardrobe';

// Copia a imagem para a pasta permanente e retorna a nova URI.
// Em web (ou se algo falhar) mantém a URI original para não quebrar o fluxo.
export function persistImage(sourceUri: string): string {
  if (!sourceUri) return sourceUri;
  if (Platform.OS === 'web') return sourceUri;
  try {
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

// Apaga (best-effort) o arquivo de imagem ao excluir uma peça, evitando órfãos.
export function deleteImageSafe(uri?: string): void {
  if (!uri || Platform.OS === 'web') return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // silencioso — limpeza é best-effort
  }
}
