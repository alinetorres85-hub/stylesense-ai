// Cliente Supabase (auth + dados na nuvem).
// A publishable key é pública por design — a segurança é garantida pelo RLS
// (cada usuário só acessa as próprias linhas).

import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lodomcqllpmzkjgtwgbo.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_zBesTgc2IkdunAMIzRmPUw_3gJ68p4I';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    // Web usa localStorage por padrão; no nativo persistimos no AsyncStorage.
    storage: Platform.OS === 'web' ? undefined : (AsyncStorage as any),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
