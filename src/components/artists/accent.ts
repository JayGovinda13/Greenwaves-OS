import { BRAND, FOREST_GRADIENT, GRAIN, LIME_GRADIENT } from '@/theme/brand';

export function accentStyle(accent: string) {
  if (accent === 'lime') return { background: LIME_GRADIENT, color: BRAND.ink, sub: BRAND.green };
  if (accent === 'cream') return { background: `${GRAIN}, ${BRAND.cream}`, color: BRAND.ink, sub: BRAND.green };
  return { background: FOREST_GRADIENT, color: BRAND.cream, sub: BRAND.lime };
}
