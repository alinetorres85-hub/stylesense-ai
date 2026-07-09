// Avatar do "provador": um manequim estilizado e personalizável usado para
// simular como as peças de um look ficam vestidas juntas.

export type Build = 'magra' | 'media' | 'curvy';
export type HairStyle = 'curto' | 'medio' | 'longo' | 'coque';

export interface AvatarConfig {
  // Foto real do usuário (corpo inteiro) usada como avatar no provador.
  photoUri?: string;
  // Campos do manequim estilizado (fallback quando não há foto).
  skin: string; // hex
  hair: string; // hex
  hairStyle: HairStyle;
  build: Build;
}

export const SKIN_TONES: { id: string; hex: string }[] = [
  { id: 'porcelana', hex: '#F2D3C0' },
  { id: 'clara', hex: '#E7B693' },
  { id: 'media', hex: '#C88A62' },
  { id: 'morena', hex: '#A16A43' },
  { id: 'escura', hex: '#6E4629' },
  { id: 'retinta', hex: '#4A2E1C' },
];

export const HAIR_COLORS: { id: string; hex: string }[] = [
  { id: 'preto', hex: '#2B2320' },
  { id: 'castanho', hex: '#5A3A24' },
  { id: 'loiro', hex: '#CBA35C' },
  { id: 'ruivo', hex: '#8E3B1E' },
  { id: 'grisalho', hex: '#9AA0A6' },
  { id: 'colorido', hex: '#9E5A8E' },
];

export const HAIR_STYLES: { id: HairStyle; label: string }[] = [
  { id: 'curto', label: 'Curto' },
  { id: 'medio', label: 'Médio' },
  { id: 'longo', label: 'Longo' },
  { id: 'coque', label: 'Coque' },
];

export const BUILDS: { id: Build; label: string }[] = [
  { id: 'magra', label: 'Magra' },
  { id: 'media', label: 'Média' },
  { id: 'curvy', label: 'Curvy' },
];

export const DEFAULT_AVATAR: AvatarConfig = {
  skin: '#E7B693',
  hair: '#5A3A24',
  hairStyle: 'longo',
  build: 'media',
};

// Largura do torso (em unidades da baseline 200) conforme o corpo escolhido.
export function torsoWidthFor(build: Build): number {
  if (build === 'magra') return 86;
  if (build === 'curvy') return 120;
  return 104;
}
