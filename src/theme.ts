// Paleta e tokens de estilo — pastel chique: dusty rose + sage sobre creme
// quente, cantos arredondados e sombras suaves amalvadas.

export const theme = {
  colors: {
    bg: '#F8F1ED',
    surface: '#FFFFFF',
    surfaceAlt: '#F2E8E8',
    text: '#43363D',
    muted: '#9C8E92',
    border: '#ECE0DF',
    accent: '#A86E9B', // rosa malva (primário)
    accentSoft: '#F2E7F1',
    accent2: '#7F9168', // sage (secundário)
    accent2Soft: '#E9EFE1',
    success: '#7BA188',
    danger: '#C56E72',
    overlay: 'rgba(67,54,61,0.45)',
  },
  radius: {
    sm: 10,
    md: 16,
    lg: 24,
    pill: 999,
  },
  spacing: (n: number) => n * 4,
  font: {
    title: 30,
    h2: 21,
    body: 15,
    small: 13,
    tiny: 11,
  },
  shadow: {
    card: {
      shadowColor: '#7A5A66',
      shadowOpacity: 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
  },
};

export type Theme = typeof theme;
