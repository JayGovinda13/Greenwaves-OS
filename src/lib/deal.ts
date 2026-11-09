// Interpreta o texto livre da coluna "Combinado" da planilha da Green Wave
// (ex.: "R$2.500 colocado", "80% bilheteria", "1000 minimo ou 70% bilheteria",
// "6k + van + alimentação + hotel", "10k + 4 passagens") em dados estruturados.
import type { DealType, Hospitality } from './domain';

export interface ParsedDeal {
  dealType: DealType;
  fee: number | null; // centavos
  doorPercent: number | null;
  hospitality: string | null; // códigos separados por vírgula
  hospitalityNotes: string | null;
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

const EXTRAS: [RegExp, Hospitality][] = [
  [/hospedagem|hotel/i, 'LODGING'],
  [/alimenta|pizza|consum/i, 'FOOD'],
  [/camarim/i, 'DRESSING_ROOM'],
  [/translado/i, 'LOCAL_TRANSFER'],
  [/a[ée]re|passage/i, 'AIRFARE'],
  [/\bvan\b|[oô]nibus|\bbus\b|transporte/i, 'GROUND_TRAVEL'],
  [/gasolina|combust/i, 'FUEL'],
  [/backline/i, 'BACKLINE'],
  [/bagagem/i, 'EXTRA_BAGGAGE'],
];

export function parseDeal(text: string | null | undefined): ParsedDeal {
  const t = (text ?? '').trim();
  if (!t || t === '-') return { dealType: 'TBD', fee: null, doorPercent: null, hospitality: null, hospitalityNotes: null };
  const codes = [...new Set(EXTRAS.filter(([re]) => re.test(t)).map(([, code]) => code))];
  const hosp = codes.length ? codes.join(',') : null;
  const notes = /log[ií]stica/i.test(t) ? 'Logística por conta do contratante' : null;

  if (/entrada fran/i.test(t)) return { dealType: 'FREE', fee: null, doorPercent: null, hospitality: hosp, hospitalityNotes: notes };

  const pct = t.match(/(\d{1,3})\s*%/) ?? t.match(/bilheteria\s*(\d{1,3})\s*\/\s*\d{1,3}/i);
  const doorPercent = pct ? Number(pct[1]) : /100%|bilheteria/i.test(t) && !pct ? 100 : null;
  const hasDoor = /bilheteria/i.test(t);
  // valor antes do % (garantia) — remove o trecho percentual para não confundir
  const withoutPct = t.replace(/\d{1,3}\s*%/g, ' ').replace(/\d{1,3}\s*\/\s*\d{1,3}/g, ' ').replace(/-R\$\s*[\d.]+/g, ' ');
  const fee = parseAmount(withoutPct);
  // escalonado "130 pax = R$2.5k" -> trata como a definir com notas
  if (/pax/i.test(t)) return { dealType: 'TBD', fee: null, doorPercent: null, hospitality: hosp, hospitalityNotes: notes };

  if (hasDoor && fee && /m[ií]nimo|ou/i.test(t)) return { dealType: 'GUARANTEE_OR_DOOR', fee, doorPercent, hospitality: hosp, hospitalityNotes: notes };
  if (hasDoor) return { dealType: 'DOOR', fee: null, doorPercent: doorPercent ?? 100, hospitality: hosp, hospitalityNotes: notes };
  if (fee) return { dealType: 'FIXED', fee, doorPercent: null, hospitality: hosp, hospitalityNotes: notes };
  return { dealType: 'TBD', fee: null, doorPercent: null, hospitality: hosp, hospitalityNotes: notes };
}

/** Extrai "Nome, 45 9800-5777" -> { name, phone } */
export function splitContact(raw: string | null | undefined): { name: string | null; phone: string | null } {
  const t = (raw ?? '').trim();
  if (!t || t === '-') return { name: null, phone: null };
  const m = t.match(/^(.*?)[,\s]*\(?(\d{2})\)?\s*(9?\d{4}[-\s]?\d{4})\s*$/);
  if (m) return { name: m[1]!.trim() || null, phone: `(${m[2]}) ${m[3]}` };
  return { name: t, phone: null };
}
