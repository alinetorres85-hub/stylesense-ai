// Gera os ícones do app (PNG) a partir de um SVG — identidade pastel malva + sage.
// Uso: node scripts/make-icons.js  (requer @resvg/resvg-js instalado localmente)

const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const MAUVE = '#9E5A8E';
const DEEP = '#6E2F62';
const CREAM = '#FBF6FA';
const SAGE = '#B7E29A';

const ASSETS = path.join(__dirname, '..', 'assets');
const PUBLIC = path.join(__dirname, '..', 'public');
if (!fs.existsSync(PUBLIC)) fs.mkdirSync(PUBLIC, { recursive: true });

// Fundo em gradiente diagonal (mauve → mauve profundo) — visual moderno.
const gradientDefs = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${MAUVE}"/>
      <stop offset="1" stop-color="${DEEP}"/>
    </linearGradient>
  </defs>`;
const gradientBg = `${gradientDefs}<rect width="1024" height="1024" fill="url(#bg)"/>`;

// Marca: cabide (contorno) + brilho de 4 pontas. Centralizada em ~512,512.
function mark(stroke, accent) {
  return `
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M512 452 L512 402 a22 22 0 1 0 -22 22" stroke="${stroke}" stroke-width="26"/>
      <path d="M512 452 L344 604 Q332 615 350 617 L674 617 Q692 615 680 604 Z" stroke="${stroke}" stroke-width="26"/>
    </g>
    <path d="M690 398 L703 431 L736 444 L703 457 L690 490 L677 457 L644 444 L677 431 Z" fill="${accent}"/>
    <path d="M356 372 L364 393 L385 401 L364 409 L356 430 L348 409 L327 401 L348 393 Z" fill="${accent}" opacity="0.85"/>
  `;
}

const scaled = (inner, s) =>
  `<g transform="translate(512,512) scale(${s}) translate(-512,-512)">${inner}</g>`;

function svg(body) {
  return `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

// Ícone principal (iOS + geral): fundo em gradiente + marca creme/sage.
const iconSvg = svg(`${gradientBg}${mark(CREAM, SAGE)}`);

// Adaptativo Android: foreground transparente (marca reduzida p/ zona segura),
// background em gradiente, monochrome branco.
const foregroundSvg = svg(scaled(mark(CREAM, SAGE), 0.72));
const backgroundSvg = svg(gradientBg);
const monochromeSvg = svg(scaled(mark('#FFFFFF', '#FFFFFF'), 0.72));

function render(svgStr, size, dir, outName) {
  const r = new Resvg(svgStr, { fitTo: { mode: 'width', value: size } });
  fs.writeFileSync(path.join(dir, outName), r.render().asPng());
  console.log('gerado:', outName, size + 'px');
}

// ícones do app (nativo)
render(iconSvg, 1024, ASSETS, 'icon.png');
render(foregroundSvg, 1024, ASSETS, 'android-icon-foreground.png');
render(backgroundSvg, 1024, ASSETS, 'android-icon-background.png');
render(monochromeSvg, 1024, ASSETS, 'android-icon-monochrome.png');
render(iconSvg, 96, ASSETS, 'favicon.png');

// ícones do PWA (web, servidos a partir de /public)
render(iconSvg, 192, PUBLIC, 'icon-192.png');
render(iconSvg, 512, PUBLIC, 'icon-512.png');
render(iconSvg, 180, PUBLIC, 'apple-touch-icon.png');
render(iconSvg, 32, PUBLIC, 'favicon.png');
console.log('OK');
