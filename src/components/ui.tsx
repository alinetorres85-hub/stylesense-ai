// Pequenos componentes de UI compartilhados.

import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { theme } from '../theme';

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  variant = 'solid',
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'solid' | 'outline' | 'ghost';
  style?: ViewStyle;
}) {
  const isSolid = variant === 'solid';
  const isOutline = variant === 'outline';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        isSolid && styles.btnSolid,
        isOutline && styles.btnOutline,
        variant === 'ghost' && styles.btnGhost,
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isSolid ? '#fff' : theme.colors.accent} />
      ) : (
        <Text
          style={[
            styles.btnLabel,
            isSolid ? { color: '#fff' } : { color: theme.colors.accent },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
    </Pressable>
  );
}

export function Swatch({ hex, size = 22 }: { hex: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: hex,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    />
  );
}

// Seletor de nível 1..5 (agasalho / formalidade)
export function LevelPicker({
  value,
  onChange,
  leftLabel,
  rightLabel,
}: {
  value: number;
  onChange: (n: number) => void;
  leftLabel: string;
  rightLabel: string;
}) {
  return (
    <View>
      <View style={styles.levelRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            style={[styles.levelDot, value === n && styles.levelDotActive]}
          >
            <Text style={[styles.levelNum, value === n && { color: '#fff' }]}>{n}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.levelLabels}>
        <Text style={styles.levelLabelText}>{leftLabel}</Text>
        <Text style={styles.levelLabelText}>{rightLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 50,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  btnSolid: { backgroundColor: theme.colors.accent },
  btnOutline: { borderWidth: 1.5, borderColor: theme.colors.accent },
  btnGhost: {},
  btnLabel: { fontSize: 16, fontWeight: '600' },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  chipLabel: { fontSize: 14, color: theme.colors.text, fontWeight: '500' },
  chipLabelActive: { color: '#fff' },
  levelRow: { flexDirection: 'row', gap: 10 },
  levelDot: {
    flex: 1,
    height: 44,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelDotActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  levelNum: { fontSize: 16, fontWeight: '600', color: theme.colors.muted },
  levelLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  levelLabelText: { fontSize: 12, color: theme.colors.muted },
});
