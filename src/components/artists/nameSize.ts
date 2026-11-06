/** Escala o tamanho do nome pelo maior termo, para nomes longos (ex.: "Leptospirose") não quebrarem no meio da palavra. */
export function nameFontSize(name: string, sizes: { lg: string; md: string; sm: string }): string {
  const longest = Math.max(...name.split(/\s+/).map((w) => w.length));
  if (longest >= 11) return sizes.sm;
  if (longest >= 8) return sizes.md;
  return sizes.lg;
}
