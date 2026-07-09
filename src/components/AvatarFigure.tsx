// Manequim estilizado que "veste" um look: desenha corpo (pele + cabelo) a
// partir do AvatarConfig e sobrepõe as fotos das peças nas zonas do corpo.
// Tudo com Views/Images (sem dependência de SVG) para rodar no nativo e no web.

import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { theme } from '../theme';
import { AvatarConfig, torsoWidthFor } from '../avatar';
import { Outfit } from '../types';

export function AvatarFigure({
  config,
  outfit,
  width = 200,
}: {
  config: AvatarConfig;
  outfit: Outfit;
  width?: number;
}) {
  const S = width / 200;
  const height = width * 2;
  const px = (n: number) => n * S;
  const { skin, hair, hairStyle, build } = config;
  const torsoW = torsoWidthFor(build);

  // retângulo posicionado por centro-x (baseline 200 de largura)
  const box = (w: number, top: number, h: number, cx = 100) => ({
    position: 'absolute' as const,
    width: px(w),
    height: px(h),
    left: px(cx - w / 2),
    top: px(top),
  });

  const { top, dress, bottom, shoes, outerwear, accessory } = outfit;
  const hasDress = !!dress;
  const legW = build === 'magra' ? 18 : build === 'curvy' ? 26 : 22;

  return (
    <View style={{ width, height }}>
      {/* sombra no chão */}
      <View
        style={[
          box(94, 388, 14),
          { backgroundColor: '#000', opacity: 0.08, borderRadius: px(7) },
        ]}
      />

      {/* cabelo (atrás da cabeça) */}
      <View
        style={[
          box(66, 6, hairStyle === 'curto' ? 56 : 66),
          { backgroundColor: hair, borderRadius: px(33) },
        ]}
      />
      {hairStyle === 'coque' && (
        <View style={[box(30, -2, 30), { backgroundColor: hair, borderRadius: px(15) }]} />
      )}
      {(hairStyle === 'medio' || hairStyle === 'longo') && (
        <>
          <View
            style={[
              box(16, 40, hairStyle === 'longo' ? 120 : 56, 72),
              { backgroundColor: hair, borderRadius: px(8) },
            ]}
          />
          <View
            style={[
              box(16, 40, hairStyle === 'longo' ? 120 : 56, 128),
              { backgroundColor: hair, borderRadius: px(8) },
            ]}
          />
        </>
      )}

      {/* cabeça */}
      <View style={[box(52, 14, 52), { backgroundColor: skin, borderRadius: px(26) }]} />
      {/* olhos */}
      <View style={[box(5, 36, 5, 90), { backgroundColor: '#3B2C28', borderRadius: px(3) }]} />
      <View style={[box(5, 36, 5, 110), { backgroundColor: '#3B2C28', borderRadius: px(3) }]} />

      {/* pescoço */}
      <View style={[box(20, 60, 22), { backgroundColor: skin }]} />

      {/* torso (pele, aparece na gola e onde não há roupa) */}
      <View
        style={[
          box(torsoW, 72, 150),
          {
            backgroundColor: skin,
            borderTopLeftRadius: px(26),
            borderTopRightRadius: px(26),
            borderBottomLeftRadius: px(14),
            borderBottomRightRadius: px(14),
          },
        ]}
      />

      {/* pernas (pele, atrás da parte de baixo) */}
      <View
        style={[
          box(legW, 196, 172, 100 - (legW / 2 + 2)),
          { backgroundColor: skin, borderRadius: px(9) },
        ]}
      />
      <View
        style={[
          box(legW, 196, 172, 100 + (legW / 2 + 2)),
          { backgroundColor: skin, borderRadius: px(9) },
        ]}
      />

      {/* casaco (camada externa, atrás da parte de cima) */}
      {outerwear && (
        <Image
          source={{ uri: outerwear.imageUri }}
          resizeMode="cover"
          style={[box(torsoW + 24, 66, hasDress ? 150 : 132), styles.piece]}
        />
      )}

      {/* vestido OU (cima + baixo) */}
      {hasDress ? (
        <Image
          source={{ uri: dress!.imageUri }}
          resizeMode="cover"
          style={[box(torsoW + 8, 74, 202), styles.piece]}
        />
      ) : (
        <>
          {top && (
            <Image
              source={{ uri: top.imageUri }}
              resizeMode="cover"
              style={[box(torsoW + 8, 74, 118), styles.piece]}
            />
          )}
          {bottom && (
            <Image
              source={{ uri: bottom.imageUri }}
              resizeMode="cover"
              style={[box(torsoW - 6, 182, 152), styles.piece]}
            />
          )}
        </>
      )}

      {/* calçado */}
      {shoes && (
        <Image
          source={{ uri: shoes.imageUri }}
          resizeMode="cover"
          style={[box(torsoW * 0.74, 344, 46), styles.piece]}
        />
      )}

      {/* acessório (junto ao ombro) */}
      {accessory && (
        <Image
          source={{ uri: accessory.imageUri }}
          resizeMode="cover"
          style={[
            box(38, 70, 38, 100 + torsoW / 2 - 8),
            styles.piece,
            { borderRadius: px(19), borderWidth: px(2), borderColor: '#FFF' },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: {
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceAlt,
  },
});
