// Paleta categórica para identificar artistas em gráficos/agenda (harmoniza com verde/lime da marca).
const PALETTE = ['#1C5A44', '#A9C424', '#D9822B', '#2D6A8E', '#B5487A', '#6B5BA8', '#C2412D', '#3E9C8A', '#8A6D3B', '#5E7D2A', '#D4A017', '#4A4E69'];

export function artistColor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length]!;
}
