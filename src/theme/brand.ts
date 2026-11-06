// Identidade visual Green Wave (portfólio Casting 2026):
// verde floresta texturizado, verde-limão elétrico, creme e tipografia display expandida.
export const BRAND = {
  forest: '#0F3B2C',
  forestDeep: '#0A2A1F',
  green: '#1C5A44',
  greenLight: '#2F7A5B',
  lime: '#C9E13E',
  limeDeep: '#A9C424',
  cream: '#FFF7EA',
  sand: '#F3EDE0',
  ink: '#17201C',
} as const;

/** Textura de granulação (feTurbulence) usada nos fundos, como nas peças impressas. */
export const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .09 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

/** Gradiente verde dos slides de artista */
export const FOREST_GRADIENT = `${GRAIN}, radial-gradient(120% 90% at 85% 0%, ${BRAND.greenLight} 0%, ${BRAND.green} 38%, ${BRAND.forest} 72%, ${BRAND.forestDeep} 100%)`;
export const LIME_GRADIENT = `${GRAIN}, linear-gradient(135deg, #D6EA55 0%, ${BRAND.lime} 55%, ${BRAND.limeDeep} 100%)`;
