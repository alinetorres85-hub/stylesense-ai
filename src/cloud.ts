// Camada chave-valor na nuvem (Supabase), por usuário. Espelha a API do kv
// local (get/set com strings JSON), então o storage.ts funciona quase igual.
// Cada valor vira uma linha em public.user_data (user_id, key, data jsonb).

import { supabase } from './supabaseClient';

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export async function cloudGet(key: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_data')
    .select('data')
    .eq('key', key)
    .maybeSingle();
  if (error) {
    console.warn('cloudGet falhou', key, error.message);
    return null;
  }
  if (!data) return null;
  // data.data é jsonb (objeto/array); devolvemos como string JSON p/ o storage.
  return JSON.stringify(data.data);
}

export async function cloudSet(key: string, value: string): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    parsed = value;
  }
  const { error } = await supabase
    .from('user_data')
    .upsert({ user_id: uid, key, data: parsed }, { onConflict: 'user_id,key' });
  if (error) console.warn('cloudSet falhou', key, error.message);
}
