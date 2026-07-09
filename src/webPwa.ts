// Configuração de PWA (somente web): injeta manifest, meta tags de tema e
// ícone Apple, e registra o service worker. No nativo é um no-op.

import { Platform } from 'react-native';

export function registerPwa(): void {
  if (Platform.OS !== 'web') return;
  const g: any = globalThis as any;
  const doc = g.document;
  if (!doc) return;

  try {
    const head = doc.head;
    const ensure = (selector: string, make: () => any) => {
      if (!doc.querySelector(selector)) head.appendChild(make());
    };

    ensure('link[rel="manifest"]', () => {
      const l = doc.createElement('link');
      l.rel = 'manifest';
      l.href = '/manifest.json';
      return l;
    });
    ensure('meta[name="theme-color"]', () => {
      const m = doc.createElement('meta');
      m.name = 'theme-color';
      m.content = '#9E5A8E';
      return m;
    });
    ensure('meta[name="apple-mobile-web-app-capable"]', () => {
      const m = doc.createElement('meta');
      m.name = 'apple-mobile-web-app-capable';
      m.content = 'yes';
      return m;
    });
    ensure('meta[name="apple-mobile-web-app-status-bar-style"]', () => {
      const m = doc.createElement('meta');
      m.name = 'apple-mobile-web-app-status-bar-style';
      m.content = 'default';
      return m;
    });
    ensure('link[rel="apple-touch-icon"]', () => {
      const l = doc.createElement('link');
      l.rel = 'apple-touch-icon';
      l.href = '/apple-touch-icon.png';
      return l;
    });
  } catch (e) {
    console.warn('PWA head setup falhou', e);
  }

  const nav = g.navigator;
  if (nav && 'serviceWorker' in nav) {
    const register = () =>
      nav.serviceWorker.register('/sw.js').catch((e: any) => console.warn('SW falhou', e));
    if (g.document.readyState === 'complete') register();
    else g.addEventListener?.('load', register);
  }
}
