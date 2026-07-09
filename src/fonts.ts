// Sistema tipográfico — Plus Jakarta Sans (moderna, geométrica-humanista).
// Aplica a fonte em TODO o app sem precisar editar cada <Text>: fazemos um
// "patch" no render do Text que injeta a família certa conforme o fontWeight.

import { Text as RNText, StyleSheet } from 'react-native';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

// Mapa passado ao useFonts() no App.
export const fontMap = {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
};

// Nomes das famílias (cada peso é registrado como uma família própria).
export const Fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
};

// Converte o fontWeight (usado nas telas) na família correspondente.
export function familyForWeight(weight?: string | number): string {
  const w = String(weight ?? '400');
  if (w === 'bold') return Fonts.bold;
  const n = parseInt(w, 10);
  if (isNaN(n)) return Fonts.regular;
  if (n >= 800) return Fonts.extrabold;
  if (n >= 700) return Fonts.bold;
  if (n >= 600) return Fonts.semibold;
  if (n >= 500) return Fonts.medium;
  return Fonts.regular;
}

// Localiza o objeto que expõe `.render` (forwardRef), atravessando um
// eventual React.memo — o react-native-web embrulha o Text em memo(forwardRef).
function findRenderHolder(Comp: any): any {
  if (!Comp) return null;
  if (typeof Comp.render === 'function') return Comp;
  if (Comp.type && typeof Comp.type.render === 'function') return Comp.type; // memo(forwardRef)
  return null;
}

// Aplica a fonte globalmente. Chamado uma vez, antes do primeiro render.
export function patchDefaultFont(): void {
  const TextAny = RNText as any;
  if (TextAny.__fontPatched) return;
  TextAny.__fontPatched = true;

  const holder = findRenderHolder(TextAny);
  if (!holder) {
    // Fallback: ao menos define a família base (só afeta Text sem style próprio).
    TextAny.defaultProps = TextAny.defaultProps || {};
    TextAny.defaultProps.style = [{ fontFamily: Fonts.regular }, TextAny.defaultProps.style];
    return;
  }

  const original = holder.render;
  // Interceptamos os PROPS de entrada (não o elemento retornado): assim a
  // família entra no pipeline normal de estilo, funcionando também no web,
  // onde o Text embrulha o conteúdo num Context.Provider.
  holder.render = function (props: any, ref: any) {
    const flat = StyleSheet.flatten(props && props.style) || {};
    // Respeita quem já escolheu uma fontFamily explícita.
    if (flat.fontFamily) return original.call(this, props, ref);
    const family = familyForWeight(flat.fontWeight);
    const patched = {
      ...props,
      style: [{ fontFamily: family }, props ? props.style : undefined, { fontWeight: undefined }],
    };
    return original.call(this, patched, ref);
  };
}
