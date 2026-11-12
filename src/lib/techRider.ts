// Ficha técnica (rider técnico) e mapa de palco: estrutura, validação e modelo inicial.
import { z } from 'zod';

const s = (max = 200) => z.string().trim().max(max).default('');

// ---------- Mapa de palco ----------
export const STAGE_ITEM_TYPES = [
  'DRUMS', 'GUITAR_AMP', 'BASS_AMP', 'KEYS', 'VOCAL', 'WEDGE', 'IEM', 'DI', 'POWER', 'RISER', 'SIDEFILL', 'PEDALBOARD', 'TEXT',
] as const;
export type StageItemType = (typeof STAGE_ITEM_TYPES)[number];
export const STAGE_ITEM_LABEL: Record<StageItemType, string> = {
  DRUMS: 'Bateria',
  GUITAR_AMP: 'Amp. guitarra',
  BASS_AMP: 'Amp. baixo',
  KEYS: 'Teclado',
  VOCAL: 'Microfone voz',
  WEDGE: 'Monitor (wedge)',
  IEM: 'In-ear',
  DI: 'Direct box',
  POWER: 'Tomada 220V/110V',
  RISER: 'Praticável',
  SIDEFILL: 'Side fill',
  PEDALBOARD: 'Pedaleira',
  TEXT: 'Texto',
};
/** Tamanho padrão de cada item no palco (unidades do SVG: palco = 1000 x 600). */
export const STAGE_ITEM_SIZE: Record<StageItemType, [number, number]> = {
  DRUMS: [170, 150],
  GUITAR_AMP: [90, 55],
  BASS_AMP: [100, 70],
  KEYS: [150, 50],
  VOCAL: [44, 44],
  WEDGE: [70, 44],
  IEM: [44, 44],
  DI: [34, 34],
  POWER: [38, 38],
  RISER: [240, 180],
  SIDEFILL: [70, 90],
  PEDALBOARD: [80, 36],
  TEXT: [140, 36],
};

export const stageItemSchema = z.object({
  id: z.string().max(40),
  type: z.enum(STAGE_ITEM_TYPES),
  x: z.number().min(0).max(1000),
  y: z.number().min(0).max(600),
  rot: z.number().min(0).max(359).default(0),
  label: s(60),
});
export type StageItem = z.infer<typeof stageItemSchema>;

// ---------- Ficha técnica ----------
export const MONITOR_TYPES = ['WEDGE', 'IEM', 'SIDEFILL', 'DRUMFILL'] as const;
export const MONITOR_TYPE_LABEL: Record<(typeof MONITOR_TYPES)[number], string> = {
  WEDGE: 'Wedge (chão)',
  IEM: 'In-ear',
  SIDEFILL: 'Side fill',
  DRUMFILL: 'Drum fill',
};
export const BACKLINE_PROVIDERS = ['BAND', 'VENUE'] as const;
export const BACKLINE_PROVIDER_LABEL: Record<(typeof BACKLINE_PROVIDERS)[number], string> = {
  BAND: 'Banda leva',
  VENUE: 'Casa fornece',
};

export const techRiderSchema = z.object({
  lineup: z.array(z.object({ name: s(80), role: s(80) })).max(20).default([]),
  inputs: z.array(z.object({ source: s(60), mic: s(60), stand: s(40), notes: s(80) })).max(64).default([]),
  monitors: z.array(z.object({ who: s(60), type: z.enum(MONITOR_TYPES).default('WEDGE'), notes: s(80) })).max(16).default([]),
  backline: z.array(z.object({ item: s(80), qty: s(10), provider: z.enum(BACKLINE_PROVIDERS).default('VENUE'), notes: s(100) })).max(40).default([]),
  stage: z
    .object({
      items: z.array(stageItemSchema).max(80).default([]),
      minWidth: s(10),
      minDepth: s(10),
    })
    .default({ items: [], minWidth: '', minDepth: '' }),
  power: s(500),
  lights: s(500),
  pa: s(500),
  setMinutes: s(10),
  soundcheckMinutes: s(10),
  changeoverMinutes: s(10),
  techContact: z.object({ name: s(80), phone: s(40), email: s(80) }).default({ name: '', phone: '', email: '' }),
  notes: s(2000),
});
export type TechRider = z.infer<typeof techRiderSchema>;

/** Lê um JSON salvo no banco, tolerando campos ausentes. */
export function parseTechRider(value: unknown): TechRider | null {
  if (!value) return null;
  const r = techRiderSchema.safeParse(value);
  return r.success ? r.data : null;
}

let seq = 0;
export const newId = () => `${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Modelo inicial de banda de rock (bateria, baixo, guitarras e vozes) para ajustar. */
export function starterRider(members: { name: string; role: string | null }[] = []): TechRider {
  const item = (type: StageItemType, x: number, y: number, label = ''): StageItem => ({ id: newId(), type, x, y, rot: 0, label });
  return techRiderSchema.parse({
    lineup: members.length ? members.map((m) => ({ name: m.name, role: m.role ?? '' })) : [
      { name: '', role: 'Voz / guitarra' },
      { name: '', role: 'Guitarra / backing vocal' },
      { name: '', role: 'Baixo / backing vocal' },
      { name: '', role: 'Bateria' },
    ],
    inputs: [
      { source: 'Bumbo', mic: 'Beta 91 / D112', stand: 'Pequeno', notes: '' },
      { source: 'Caixa', mic: 'SM57', stand: 'Pequeno', notes: '' },
      { source: 'Hi-hat', mic: 'Condensador', stand: 'Pequeno', notes: '' },
      { source: 'Tom', mic: 'e604 / clip', stand: '', notes: '' },
      { source: 'Surdo', mic: 'e604 / clip', stand: '', notes: '' },
      { source: 'Overhead L', mic: 'Condensador', stand: 'Grande', notes: '' },
      { source: 'Overhead R', mic: 'Condensador', stand: 'Grande', notes: '' },
      { source: 'Baixo', mic: 'DI', stand: '', notes: '' },
      { source: 'Guitarra 1', mic: 'SM57', stand: 'Pequeno', notes: '' },
      { source: 'Guitarra 2', mic: 'SM57', stand: 'Pequeno', notes: '' },
      { source: 'Voz 1 (principal)', mic: 'SM58', stand: 'Grande', notes: '' },
      { source: 'Voz 2', mic: 'SM58', stand: 'Grande', notes: '' },
      { source: 'Voz 3', mic: 'SM58', stand: 'Grande', notes: '' },
    ],
    monitors: [
      { who: 'Voz / guitarra (centro)', type: 'WEDGE', notes: '' },
      { who: 'Guitarra', type: 'WEDGE', notes: '' },
      { who: 'Baixo', type: 'WEDGE', notes: '' },
      { who: 'Bateria', type: 'DRUMFILL', notes: '' },
    ],
    backline: [
      { item: 'Bateria completa (bumbo 22", tons, surdo, ferragens)', qty: '1', provider: 'VENUE', notes: 'Banda leva caixa, pratos e pedal' },
      { item: 'Amplificador de baixo', qty: '1', provider: 'VENUE', notes: '' },
      { item: 'Amplificador de guitarra', qty: '2', provider: 'VENUE', notes: '' },
      { item: 'Tomadas no palco (pontos de AC)', qty: '4', provider: 'VENUE', notes: 'Junto às pedaleiras e à bateria' },
    ],
    stage: {
      minWidth: '6',
      minDepth: '4',
      items: [
        item('RISER', 500, 170),
        item('DRUMS', 500, 170, 'Bateria'),
        item('BASS_AMP', 220, 130, 'Baixo'),
        item('GUITAR_AMP', 780, 130, 'Guitarra 2'),
        item('GUITAR_AMP', 640, 110, 'Guitarra 1'),
        item('VOCAL', 260, 400, 'Voz 3'),
        item('VOCAL', 500, 420, 'Voz 1'),
        item('VOCAL', 740, 400, 'Voz 2'),
        item('WEDGE', 260, 500), item('WEDGE', 500, 520), item('WEDGE', 740, 500),
        item('POWER', 330, 150), item('POWER', 700, 180), item('POWER', 600, 250),
      ],
    },
    power: 'Pontos de energia estabilizados no palco (ver mapa), 127V ou 220V informados com antecedência.',
    lights: 'Luz geral de palco. Sem estrobo constante.',
    pa: 'PA adequado à casa, mesa digital com no mínimo 16 canais e técnico da casa disponível na passagem de som.',
    setMinutes: '50',
    soundcheckMinutes: '40',
    changeoverMinutes: '15',
  });
}

export const emptyRider = (): TechRider => techRiderSchema.parse({});
