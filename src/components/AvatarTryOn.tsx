// Modal "Provador": mostra o look vestido no avatar e permite personalizar o
// avatar (tom de pele, cor e estilo do cabelo, tipo de corpo).

import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { useWardrobe } from '../store';
import { Outfit, outfitPieces } from '../types';
import {
  BUILDS,
  HAIR_COLORS,
  HAIR_STYLES,
  SKIN_TONES,
} from '../avatar';
import { AvatarFigure } from './AvatarFigure';

export function AvatarTryOn({
  visible,
  outfit,
  title = 'Provador',
  onClose,
}: {
  visible: boolean;
  outfit: Outfit;
  title?: string;
  onClose: () => void;
}) {
  const { avatar, updateAvatar } = useWardrobe();
  const [showCustom, setShowCustom] = useState(false);
  const empty = outfitPieces(outfit).length === 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.colors.text} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingBottom: 28, alignItems: 'center' }}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.stage}>
              <AvatarFigure config={avatar} outfit={outfit} width={190} />
            </View>
            {empty && (
              <Text style={styles.hint}>
                Escolha ou monte um look para vestir o avatar. ✨
              </Text>
            )}

            <Pressable
              style={styles.customToggle}
              onPress={() => setShowCustom((v) => !v)}
            >
              <Ionicons
                name={showCustom ? 'chevron-up' : 'color-palette-outline'}
                size={16}
                color={theme.colors.accent}
              />
              <Text style={styles.customToggleText}>
                {showCustom ? 'Ocultar personalização' : 'Personalizar avatar'}
              </Text>
            </Pressable>

            {showCustom && (
              <View style={styles.custom}>
                <Text style={styles.label}>Tom de pele</Text>
                <View style={styles.row}>
                  {SKIN_TONES.map((s) => (
                    <Swatch
                      key={s.id}
                      hex={s.hex}
                      selected={avatar.skin === s.hex}
                      onPress={() => updateAvatar({ skin: s.hex })}
                    />
                  ))}
                </View>

                <Text style={styles.label}>Cor do cabelo</Text>
                <View style={styles.row}>
                  {HAIR_COLORS.map((c) => (
                    <Swatch
                      key={c.id}
                      hex={c.hex}
                      selected={avatar.hair === c.hex}
                      onPress={() => updateAvatar({ hair: c.hex })}
                    />
                  ))}
                </View>

                <Text style={styles.label}>Estilo do cabelo</Text>
                <View style={styles.row}>
                  {HAIR_STYLES.map((h) => (
                    <Chip
                      key={h.id}
                      label={h.label}
                      active={avatar.hairStyle === h.id}
                      onPress={() => updateAvatar({ hairStyle: h.id })}
                    />
                  ))}
                </View>

                <Text style={styles.label}>Corpo</Text>
                <View style={styles.row}>
                  {BUILDS.map((b) => (
                    <Chip
                      key={b.id}
                      label={b.label}
                      active={avatar.build === b.id}
                      onPress={() => updateAvatar({ build: b.id })}
                    />
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Swatch({
  hex,
  selected,
  onPress,
}: {
  hex: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.swatch, { backgroundColor: hex }, selected && styles.swatchOn]}
    >
      {selected && <Ionicons name="checkmark" size={16} color="#FFF" />}
    </Pressable>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipOn]}
    >
      <Text style={[styles.chipText, active && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.bg,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingHorizontal: 20,
    paddingTop: 14,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: { fontSize: theme.font.h2, fontWeight: '800', color: theme.colors.text },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 6,
    ...theme.shadow.card,
  },
  hint: {
    fontSize: theme.font.small,
    color: theme.colors.muted,
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: 20,
  },
  customToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accentSoft,
  },
  customToggleText: { color: theme.colors.accent, fontWeight: '700', fontSize: theme.font.small },
  custom: { alignSelf: 'stretch', marginTop: 14 },
  label: {
    fontSize: theme.font.small,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 14,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  swatchOn: { borderColor: theme.colors.accent, borderWidth: 3 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipOn: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  chipText: { color: theme.colors.text, fontWeight: '600', fontSize: theme.font.small },
  chipTextOn: { color: '#FFF' },
});
