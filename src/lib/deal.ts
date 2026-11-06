// Interpreta o texto livre da coluna "Combinado" da planilha da Green Wave
// (ex.: "R$2.500 colocado", "80% bilheteria", "1000 minimo ou 70% bilheteria",
// "6k + van + alimentação + hotel", "10k + 4 passagens") em dados estruturados.
import type { DealType } from './domain';

export interface ParsedDeal {
  dealType: DealType;
  fee: number | null; // centavos
  doorPercent: number | null;
  hospitality: string | null;
}

function parseAmount(raw: string): number | null {
  // "R$2.500" | "2 mil" | "6k" | "13mil" | "1000" | "R$18.000" | "4500"
  const m = raw.match(/(?:R\$\s*)?(\d{1,3}(?:[.\s]\d{3})+|\d+(?:[.,]\d+)?)\s*(k|mil)?\b/i);
  if (!m) return null;
  let num = m[1]!;
  const mult = m[2] ? 1000 : 1;
  if (/^\d{1,3}([.\s]\d{3})+$/.test(num)) num = num.replace(/[.\s]/g, '');
  else num = num.replace(',', '.');
  const value = Number(num) * mult;
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : null;
}

const EXTRAS: [RegExp, string][] = [
  [/hospedagem|hotel/i, 'Hospedagem'],
  [/alimenta|pizza|consum|camarim/i, 'Alimentação/camarim'],
  [/a[ée]re|passage/i, 'Passagens'],
  [/van|[oô]nibus|bus\b|transporte|translado|gasolina/i, 'Transporte'],
  [/backline/i, 'Backline'],
  [/log[ií]stica/i, 'Logística'],
  [/bagagem/i, 'Bagagem'],
];

export function parseDeal(text: string | null | undefined): ParsedDeal {
  const t = (text ?? '').trim();
  if (!t || t === '-') return { dealType: 'TBD', fee: null, doorPercent: null, hospitality: null };
  const hospitality = EXTRAS.filter(([re]) => re.test(t)).map(([, label]) => label);
  const hosp = hospitality.length ? hospitality.join(', ') : null;

  if (/entrada fran/i.test(t)) return { dealType: 'FREE', fee: null, doorPercent: null, hospitality: hosp };

  const pct = t.match(/(\d{1,3})\s*%/) ?? t.match(/bilheteria\s*(\d{1,3})\s*\/\s*\d{1,3}/i);
  const doorPercent = pct ? Number(pct[1]) : /100%|bilheteria/i.test(t) && !pct ? 100 : null;
  const hasDoor = /bilheteria/i.test(t);
  // valor antes do % (garantia) — remove o trecho percentual para não confundir
  const withoutPct = t.replace(/\d{1,3}\s*%/g, ' ').replace(/\d{1,3}\s*\/\s*\d{1,3}/g, ' ').replace(/-R\$\s*[\d.]+/g, ' ');
  const fee = parseAmount(withoutPct);
  // escalonado "130 pax = R$2.5k" -> trata como a definir com notas
  if (/pax/i.test(t)) return { dealType: 'TBD', fee: null, doorPercent: null, hospitality: hosp };

  if (hasDoor && fee && /m[ií]nimo|ou/i.test(t)) return { dealType: 'GUARANTEE_OR_DOOR', fee, doorPercent, hospitality: hosp };
  if (hasDoor) return { dealType: 'DOOR', fee: null, doorPercent: doorPercent ?? 100, hospitality: hosp };
  if (fee) return { dealType: 'FIXED', fee, doorPercent: null, hospitality: hosp };
  return { dealType: 'TBD', fee: null, doorPercent: null, hospitality: hosp };
}

/** Extrai "Nome, 45 9800-5777" -> { name, phone } */
export function splitContact(raw: string | null | undefined): { name: string | null; phone: string | null } {
  const t = (raw ?? '').trim();
  if (!t || t === '-') return { name: null, phone: null };
  const m = t.match(/^(.*?)[,\s]*\(?(\d{2})\)?\s*(9?\d{4}[-\s]?\d{4})\s*$/);
  if (m) return { name: m[1]!.trim() || null, phone: `(${m[2]}) ${m[3]}` };
  return { name: t, phone: null };
}
