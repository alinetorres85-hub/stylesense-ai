// Tela de login / criar conta (email + senha via Supabase).

import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { supabase } from '../supabaseClient';

// Traduz as mensagens de erro mais comuns do Supabase.
function translateError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'Email ou senha incorretos.';
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'Esse email já tem conta. Tente entrar.';
  if (m.includes('password should be at least'))
    return 'A senha precisa ter pelo menos 6 caracteres.';
  if (m.includes('unable to validate email') || m.includes('invalid email'))
    return 'Email inválido.';
  if (m.includes('email not confirmed'))
    return 'Confirme seu email antes de entrar (verifique a caixa de entrada).';
  return msg;
}

export function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const isSignup = mode === 'signup';

  async function submit() {
    setError(null);
    setInfo(null);
    const mail = email.trim();
    if (!mail || !password) {
      setError('Preencha email e senha.');
      return;
    }
    setLoading(true);
    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({ email: mail, password });
        if (error) throw error;
        // Se a confirmação de email estiver ligada, não vem sessão na hora.
        if (!data.session) {
          setInfo('Conta criada! Confirme seu email para entrar.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: mail, password });
        if (error) throw error;
      }
      // Sucesso com sessão: o AuthProvider troca de tela automaticamente.
    } catch (e: any) {
      setError(translateError(e?.message ?? 'Algo deu errado. Tente de novo.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <View style={styles.brandDot}>
            <Ionicons name="sparkles" size={22} color="#FFFFFF" />
          </View>
          <Text style={styles.brandName}>StyleSense AI</Text>
          <Text style={styles.tagline}>Seu guarda-roupa inteligente</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>{isSignup ? 'Criar conta' : 'Entrar'}</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="voce@email.com"
            placeholderTextColor={theme.colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            inputMode="email"
          />

          <Text style={styles.label}>Senha</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="mínimo 6 caracteres"
            placeholderTextColor={theme.colors.muted}
            secureTextEntry
            autoCapitalize="none"
          />

          {error && <Text style={styles.error}>⚠️ {error}</Text>}
          {info && <Text style={styles.info}>✅ {info}</Text>}

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={submit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>{isSignup ? 'Criar conta' : 'Entrar'}</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              setMode(isSignup ? 'login' : 'signup');
              setError(null);
              setInfo(null);
            }}
            style={styles.switch}
          >
            <Text style={styles.switchText}>
              {isSignup ? 'Já tem conta? ' : 'Ainda não tem conta? '}
              <Text style={styles.switchLink}>{isSignup ? 'Entrar' : 'Criar conta'}</Text>
            </Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>
          Seus dados ficam salvos na sua conta e sincronizam entre aparelhos. 💜
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.bg },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  brand: { alignItems: 'center', marginBottom: 24 },
  brandDot: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...theme.shadow.accent,
  },
  brandName: {
    fontSize: theme.font.display,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.8,
  },
  tagline: { fontSize: theme.font.body, color: theme.colors.muted, marginTop: 2 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 22,
    ...theme.shadow.card,
  },
  title: {
    fontSize: theme.font.h2,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 8,
  },
  label: {
    fontSize: theme.font.small,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme.colors.bg,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: theme.font.body,
    color: theme.colors.text,
  },
  error: { color: theme.colors.danger, fontSize: theme.font.small, marginTop: 12 },
  info: { color: theme.colors.success, fontSize: theme.font.small, marginTop: 12 },
  button: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.pill,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
    ...theme.shadow.accent,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontWeight: '800', fontSize: theme.font.body },
  switch: { alignItems: 'center', marginTop: 18 },
  switchText: { color: theme.colors.muted, fontSize: theme.font.small },
  switchLink: { color: theme.colors.accent, fontWeight: '800' },
  footer: {
    textAlign: 'center',
    color: theme.colors.muted,
    fontSize: theme.font.tiny,
    marginTop: 20,
    paddingHorizontal: 20,
  },
});
