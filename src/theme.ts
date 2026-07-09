// Paleta e tokens de estilo — rebrand moderno: mauve rico + sage sobre um
// off-white limpo, tinta escura pra contraste, cantos generosos e sombras suaves.

import { Fonts } from './fonts';

export const theme = {
  colors: {
    bg: '#FAF7F5',
    surface: '#FFFFFF',
    surfaceAlt: '#F4EDF1',
    text: '#211B1F', // tinta escura (mais contraste, mais atual)
    muted: '#8B8189',
    border: '#EDE3E9',
    accent: '#9E5A8E', // mauve rico (primário)
    accentSoft: '#F5E8F2',
    accentDeep: '#7C3F6F', // mauve profundo (wordmark / estados pressionados)
    accent2: '#6F8557', // sage (secundário)
    accent2Soft: '#E9EFE1',
    success: '#5E9B79',
    danger: '#C7595F',
    overlay: 'rgba(33,27,31,0.5)',
  },
  radius: {
    sm: 12,
    md: 18,
    lg: 26,
    xl: 32,
    pill: 999,
  },
  spacing: (n: number) => n * 4,
  fonts: Fonts,
  font: {
    display: 34,
    title: 27,
    h2: 20,
    body: 15,
    small: 13,
    tiny: 11,
  },
  shadow: {
    card: {
      shadowColor: '#6E4A63',
      shadowOpacity: 0.1,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
    },
    accent: {
      shadowColor: '#9E5A8E',
      shadowOpacity: 0.35,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
  },
};

export type Theme = typeof theme;
