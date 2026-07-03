// Miniatura de uma peça: foto (ou emoji da categoria) com selo de cor.

import React, { useEffect, useState } from 'react';
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { CATEGORY_EMOJI, COLORS, ClothingItem } from '../types';
import { theme } from '../theme';

export function ItemThumb({
  item,
  style,
  rounded = theme.radius.md,
}: {
  item: ClothingItem;
  style?: StyleProp<ViewStyle>;
  rounded?: number;
}) {
  const color = COLORS.find((c) => c.id === item.colorId);
  // se a imagem falhar (ex.: arquivo apagado), cai no emoji da categoria
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [item.imageUri]);
  const showImage = !!item.imageUri && !failed;

  return (
    <View style={[styles.wrap, { borderRadius: rounded }, style]}>
      {showImage ? (
        <Image
          source={{ uri: item.imageUri }}
          style={styles.img}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.emoji}>{CATEGORY_EMOJI[item.category]}</Text>
        </View>
      )}
      {color && (
        <View style={[styles.dot, { backgroundColor: color.hex }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.colors.surfaceAlt,
    overflow: 'hidden',
    position: 'relative',
  },
  img: { width: '100%', height: '100%' },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  emoji: { fontSize: 40 },
  dot: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
});
