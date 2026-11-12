// Ficha técnica de produção (formato Green Wave): dados do show que vão para a banda —
// horários-chave, evento, cronograma da casa, observações e rider técnico da casa.
import { z } from 'zod';

const s = (max = 200) => z.string().trim().max(max).default('');

export const rundownItemSchema = z.object({
  start: z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm').default(''),
  end: z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm').default(''),
  label: s(120),
  ours: z.boolean().default(false), // destaque (horário da banda)
});
export type RundownItem = z.infer<typeof rundownItemSchema>;

export const teamMemberSchema = z.object({ role: s(60), name: s(80), phone: s(40) });

export const productionSchema = z.object({
  soundcheck: s(30), // "18:30 – 20:00"
  doors: s(30),
  showtime: s(30),
  courtesies: s(20),
  responsible: s(120), // responsável na casa (nome · telefone)
  promoter: s(120), // contratante (nome · telefone)
  team: z.array(teamMemberSchema).max(20).default([]),
  rundown: z.array(rundownItemSchema).max(40).default([]),
  notes: s(3000),
  venueRider: z
    .object({
      pa: s(1000),
      monitor: s(1000),
      mics: s(1000),
      guitar: s(1000),
      bass: s(1000),
      drums: s(1000),
      other: s(1000),
      notes: s(2000),
    })
    .default({ pa: '', monitor: '', mics: '', guitar: '', bass: '', drums: '', other: '', notes: '' }),
});
export type Production = z.infer<typeof productionSchema>;

export function parseProduction(value: unknown): Production | null {
  if (!value) return null;
  const r = productionSchema.safeParse(value);
  return r.success ? r.data : null;
}

export const emptyProduction = (): Production => productionSchema.parse({});

/** Itens de uma lista em texto (um por linha) para bullets. */
export const lines = (v: string) => v.split('\n').map((l) => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);

export const VENUE_RIDER_FIELDS: { key: keyof Production['venueRider']; label: string; group: 'som' | 'backline' | 'notas' }[] = [
  { key: 'pa', label: 'PA', group: 'som' },
  { key: 'monitor', label: 'Monitor', group: 'som' },
  { key: 'mics', label: 'Microfones e DIs', group: 'som' },
  { key: 'guitar', label: 'Guitarra', group: 'backline' },
  { key: 'bass', label: 'Baixo', group: 'backline' },
  { key: 'drums', label: 'Bateria', group: 'backline' },
  { key: 'other', label: 'Outros', group: 'backline' },
  { key: 'notes', label: 'Observações técnicas', group: 'notas' },
];

export function hasVenueRider(p: Production): boolean {
  return Object.values(p.venueRider).some((v) => v.trim());
}

// ---------- Deslocamentos ----------
export const TRAVEL_MODES = ['BUS', 'FLIGHT', 'VAN', 'CAR', 'OTHER'] as const;
export const TRAVEL_MODE_LABEL: Record<(typeof TRAVEL_MODES)[number], string> = {
  BUS: 'Ônibus',
  FLIGHT: 'Voo',
  VAN: 'Van',
  CAR: 'Carro',
  OTHER: 'Outro',
};
export const TRAVEL_DIRECTIONS = ['IDA', 'VOLTA', 'TRECHO'] as const;
export const TRAVEL_DIRECTION_LABEL: Record<(typeof TRAVEL_DIRECTIONS)[number], string> = { IDA: 'Ida', VOLTA: 'Volta', TRECHO: 'Trecho' };

const time = z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm').optional().transform((v) => v || null);
const opt = z.string().trim().max(200).optional().transform((v) => v || null);

export const travelLegSchema = z.object({
  mode: z.enum(TRAVEL_MODES),
  direction: z.enum(TRAVEL_DIRECTIONS),
  passengers: opt,
  company: opt,
  code: opt,
  origin: z.string().trim().min(1, 'Informe a origem').max(120),
  destination: z.string().trim().min(1, 'Informe o destino').max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data'),
  departure: time,
  arrival: time,
  boarding: time,
  tickets: z
    .array(z.object({ label: z.string().trim().min(1).max(60), url: z.string().trim().url('Link inválido').max(500) }))
    .max(12)
    .default([]),
  notes: z.string().trim().max(1000).optional().transform((v) => v || null),
});
export type TravelLegInput = z.input<typeof travelLegSchema>;

/** Janela em torno das datas dos shows para incluir deslocamentos na ficha. */
export const TRAVEL_WINDOW_BEFORE = 3;
export const TRAVEL_WINDOW_AFTER = 2;
