// Vocabulário de domínio compartilhado (validação, labels em PT-BR e cores de status).
import { z } from 'zod';

export const ROLES = ['OWNER', 'ADMIN', 'PRODUCER', 'VIEWER'] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABEL: Record<Role, string> = {
  OWNER: 'Sócio(a)',
  ADMIN: 'Administração',
  PRODUCER: 'Produção',
  VIEWER: 'Leitura',
};
export const ROLE_RANK: Record<Role, number> = { VIEWER: 0, PRODUCER: 1, ADMIN: 2, OWNER: 3 };

export const SHOW_STATUS = ['PROSPECT', 'NEGOTIATING', 'CONFIRMED', 'DONE', 'CANCELED'] as const;
export type ShowStatus = (typeof SHOW_STATUS)[number];
export const SHOW_STATUS_LABEL: Record<ShowStatus, string> = {
  PROSPECT: 'Prospecção',
  NEGOTIATING: 'Negociando',
  CONFIRMED: 'Confirmado',
  DONE: 'Realizado',
  CANCELED: 'Cancelado',
};
export const SHOW_STATUS_COLOR: Record<ShowStatus, 'default' | 'info' | 'warning' | 'success' | 'error' | 'primary'> = {
  PROSPECT: 'default',
  NEGOTIATING: 'warning',
  CONFIRMED: 'primary',
  DONE: 'success',
  CANCELED: 'error',
};

export const DEAL_TYPES = ['FIXED', 'DOOR', 'GUARANTEE_OR_DOOR', 'FREE', 'TBD'] as const;
export type DealType = (typeof DEAL_TYPES)[number];
export const DEAL_TYPE_LABEL: Record<DealType, string> = {
  FIXED: 'Cachê fixo',
  DOOR: '% de bilheteria',
  GUARANTEE_OR_DOOR: 'Mínimo ou % bilheteria',
  FREE: 'Entrada franca',
  TBD: 'A definir',
};

export const CONTACT_KINDS = ['VENUE', 'FESTIVAL', 'COLLECTIVE', 'PRODUCER', 'PRESS', 'SUPPLIER', 'OTHER'] as const;
export type ContactKind = (typeof CONTACT_KINDS)[number];
export const CONTACT_KIND_LABEL: Record<ContactKind, string> = {
  VENUE: 'Casa de show',
  FESTIVAL: 'Festival',
  COLLECTIVE: 'Coletivo',
  PRODUCER: 'Produtor(a)',
  PRESS: 'Imprensa',
  SUPPLIER: 'Fornecedor',
  OTHER: 'Outro',
};

export const TX_TYPES = ['INCOME', 'EXPENSE'] as const;
export type TxType = (typeof TX_TYPES)[number];
export const TX_CATEGORIES = [
  'FEE', 'COMMISSION', 'TICKETING', 'TRAVEL', 'LODGING', 'FOOD', 'BACKLINE', 'MARKETING', 'CARD', 'PAYOUT', 'OTHER',
] as const;
export type TxCategory = (typeof TX_CATEGORIES)[number];
export const TX_CATEGORY_LABEL: Record<TxCategory, string> = {
  FEE: 'Cachê',
  COMMISSION: 'Comissão Green Wave',
  TICKETING: 'Bilheteria',
  TRAVEL: 'Passagens / transporte',
  LODGING: 'Hospedagem',
  FOOD: 'Alimentação',
  BACKLINE: 'Backline / técnica',
  MARKETING: 'Divulgação',
  CARD: 'Cartão Green Wave',
  PAYOUT: 'Repasse ao artista',
  OTHER: 'Outros',
};
export const TX_STATUS = ['PENDING', 'PAID', 'CANCELED'] as const;
export type TxStatus = (typeof TX_STATUS)[number];
export const TX_STATUS_LABEL: Record<TxStatus, string> = { PENDING: 'Pendente', PAID: 'Pago', CANCELED: 'Cancelado' };
export const TX_METHODS = ['PIX', 'TRANSFER', 'CARD', 'CASH', 'BOLETO'] as const;
export const TX_METHOD_LABEL: Record<(typeof TX_METHODS)[number], string> = {
  PIX: 'Pix', TRANSFER: 'Transferência', CARD: 'Cartão', CASH: 'Dinheiro', BOLETO: 'Boleto',
};

export const BR_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;
export const STATE_NAME: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal',
  ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais',
  PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
};
export const REGION_BY_STATE: Record<string, string> = {
  AC: 'Norte', AP: 'Norte', AM: 'Norte', PA: 'Norte', RO: 'Norte', RR: 'Norte', TO: 'Norte',
  AL: 'Nordeste', BA: 'Nordeste', CE: 'Nordeste', MA: 'Nordeste', PB: 'Nordeste', PE: 'Nordeste', PI: 'Nordeste', RN: 'Nordeste', SE: 'Nordeste',
  DF: 'Centro-Oeste', GO: 'Centro-Oeste', MT: 'Centro-Oeste', MS: 'Centro-Oeste',
  ES: 'Sudeste', MG: 'Sudeste', RJ: 'Sudeste', SP: 'Sudeste',
  PR: 'Sul', RS: 'Sul', SC: 'Sul',
};

export const SHOW_CHECKLIST = [
  { key: 'chkPoster', label: 'Cartaz' },
  { key: 'chkTickets', label: 'Link de ingressos' },
  { key: 'chkTechSheet', label: 'Pré-produção / ficha técnica' },
  { key: 'chkSocial', label: 'Redes sociais' },
  { key: 'chkTravel', label: 'Passagens' },
  { key: 'chkLodging', label: 'Hospedagem' },
  { key: 'chkCrewList', label: 'Lista de equipe' },
  { key: 'chkGuests', label: 'Lista de convidados' },
  { key: 'chkSettled', label: 'Fechamento' },
] as const;
export type ChecklistKey = (typeof SHOW_CHECKLIST)[number]['key'];

// ---------- Schemas de formulário ----------
const optStr = z.string().trim().max(2000).optional().transform((v) => (v ? v : null));
const optUrl = optStr;
const optInt = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === '' || v === null) return null;
    const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? Math.round(n) : null;
  });
/** Valor digitado em reais ("2.500,00" ou "2500") -> centavos */
export const moneyInput = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || v === '') return null;
    if (typeof v === 'number') return Math.round(v * 100);
    const s = v.replace(/[R$\s]/g, '');
    // pt-BR: "1.500" e "1.500,00" usam ponto como separador de milhar
    const normalized = s.includes(',')
      ? s.replace(/\./g, '').replace(',', '.')
      : /^\d{1,3}(\.\d{3})+$/.test(s)
        ? s.replace(/\./g, '')
        : s;
    const n = Number(normalized);
    return Number.isFinite(n) ? Math.round(n * 100) : null;
  });

export const showSchema = z.object({
  artistId: z.string().min(1, 'Selecione o artista'),
  contactId: optStr,
  date: z.string().min(1, 'Informe a data'),
  status: z.enum(SHOW_STATUS),
  city: optStr,
  state: optStr,
  venue: optStr,
  eventName: optStr,
  contactName: optStr,
  dealType: z.enum(DEAL_TYPES),
  fee: moneyInput,
  doorPercent: optInt,
  dealNotes: optStr,
  hospitality: optStr,
  ticketUrl: optUrl,
  ticketsSold: optInt,
  capacity: optInt,
  ticketPrice: moneyInput,
  posterUrl: optUrl,
  socialUrl: optUrl,
  techSheetUrl: optUrl,
  travel: optStr,
  lodging: optStr,
  crewList: optStr,
  guestList: optStr,
  notes: optStr,
});
export type ShowInput = z.input<typeof showSchema>;

export const artistSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome'),
  instagram: optStr,
  originCity: optStr,
  originState: optStr,
  genres: optStr,
  bio: optStr,
  latestRelease: optStr,
  label: optStr,
  mediaKitUrl: optUrl,
  riderUrl: optUrl,
  photosUrl: optUrl,
  settlementUrl: optUrl,
  baseFee: moneyInput,
  accent: z.enum(['green', 'lime', 'cream']).default('green'),
  active: z.boolean().default(true),
});

export const memberSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome'),
  role: optStr,
  birthDate: optStr,
  documentRg: optStr,
  documentCpf: optStr,
  phone: optStr,
  email: optStr,
  restrictions: optStr,
});

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome'),
  company: optStr,
  kind: z.enum(CONTACT_KINDS),
  region: optStr,
  state: optStr,
  city: optStr,
  phone: optStr,
  email: optStr,
  instagram: optStr,
  link: optUrl,
  notes: optStr,
});

export const transactionSchema = z.object({
  type: z.enum(TX_TYPES),
  category: z.enum(TX_CATEGORIES),
  description: z.string().trim().min(1, 'Descreva o lançamento'),
  amount: moneyInput.refine((v) => v !== null && v > 0, 'Informe um valor maior que zero'),
  date: z.string().min(1, 'Informe a data'),
  dueDate: optStr,
  status: z.enum(TX_STATUS),
  method: optStr,
  showId: optStr,
  artistId: optStr,
  notes: optStr,
});

// ---------- Tarefas ----------
export const TASK_PRIORITIES = ['LOW', 'NORMAL', 'HIGH'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = { LOW: 'Baixa', NORMAL: 'Normal', HIGH: 'Alta' };

export const taskSchema = z.object({
  title: z.string().trim().min(1, 'Descreva a tarefa').max(200),
  description: optStr,
  assigneeId: z.string().min(1, 'Escolha o responsável'),
  dueDate: optStr,
  priority: z.enum(TASK_PRIORITIES).default('NORMAL'),
  showId: optStr,
});
