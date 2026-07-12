// Upload de fotos para o Supabase Storage (bucket "wardrobe").
// Assim o banco guarda só a URL (leve) — não a foto inteira em base64, que não
// escala para muitas peças.

import { supabase } from './supabaseClient';

const BUCKET = 'wardrobe';

export function isDataUrl(uri?: string | null): boolean {
  return !!uri && uri.startsWith('data:');
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; contentType: string } {
  const comma = dataUrl.indexOf(',');
  const head = dataUrl.slice(0, comma);
  const b64 = dataUrl.slice(comma + 1);
  const contentType = head.slice(5, head.indexOf(';')) || 'image/jpeg';
  const bin = (globalThis as any).atob(b64) as string;
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, contentType };
}

async function currentUid(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

// Sobe uma imagem (data URL) e devolve a URL pública. Lança erro se falhar.
export async function uploadImage(dataUrl: string): Promise<string> {
  const uid = await currentUid();
  if (!uid) throw new Error('Não está logado.');
  const { bytes, contentType } = dataUrlToBytes(dataUrl);
  const ext = contentType.includes('png') ? 'png' : 'jpg';
  const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType,
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
