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

// Converte um blob HEIC/HEIF em data URL JPEG (via heic2any, carregado sob demanda).
async function heicBlobToJpegDataUrl(blob: Blob): Promise<string> {
  const heic2any = (await import('heic2any')).default as any;
  const out = await heic2any({ blob, toType: 'image/jpeg', quality: 0.85 });
  const jpeg = Array.isArray(out) ? out[0] : out;
  return await new Promise<string>((res, rej) => {
    const r = new (globalThis as any).FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(jpeg);
  });
}

// Garante que a foto da peça esteja no Storage e em formato que o navegador
// exibe (JPEG). Devolve a NOVA url se mudou algo, ou null se já estava ok.
// Repara também fotos antigas que subiram como HEIC (não exibem).
export async function syncItemImage(uri: string): Promise<string | null> {
  if (!uri) return null;

  // Foto ainda embutida no banco (data URL) → sobe pro Storage.
  if (isDataUrl(uri)) {
    if (/^data:image\/hei[cf]/i.test(uri)) {
      const blob = await (await fetch(uri)).blob();
      return await uploadImage(await heicBlobToJpegDataUrl(blob));
    }
    return await uploadImage(uri);
  }

  // Já no Storage: se estiver em HEIC, baixa, converte e re-envia.
  if (uri.includes('/storage/v1/object/public/')) {
    try {
      const head = await fetch(uri, { method: 'HEAD' });
      const ct = head.headers.get('content-type') || '';
      if (/hei[cf]/i.test(ct)) {
        const blob = await (await fetch(uri)).blob();
        return await uploadImage(await heicBlobToJpegDataUrl(blob));
      }
    } catch {
      // ignora — mantém como está
    }
    return null;
  }
  return null;
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
