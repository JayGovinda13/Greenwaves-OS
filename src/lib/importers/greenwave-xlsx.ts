// Importador da planilha operacional "Green Wave - Geral.xlsx".
// Abas suportadas: "Shows", "Shows 2027" (qualquer aba com cabeçalho DATA/Banda),
// "Dados das bandas", "Contatos", "Fechamentos" e "Cópia de Lista de Contatos".
// O import é idempotente: rodar duas vezes não duplica shows, integrantes nem contatos.
import ExcelJS from 'exceljs';
import type { PrismaClient } from '@prisma/client';
import { parseDeal, splitContact } from '../deal';
import { REGION_BY_STATE } from '../domain';
import { slugify } from '../format';
import { CASTING_2026 } from '../../../prisma/data/casting';

export interface ImportedShow {
  date: string; // YYYY-MM-DD
  artist: string;
  city: string | null;
  state: string | null;
  venue: string | null;
  venueUrl: string | null;
  contactName: string | null;
  contactPhone: string | null;
  posterUrl: string | null;
  ticketUrl: string | null;
  ticketsSold: number | null;
  techSheetUrl: string | null;
  socialUrl: string | null;
  dealNotes: string | null;
  travel: string | null;
  lodging: string | null;
  crewList: string | null;
  guestList: string | null;
}
export interface ImportedMember {
  artist: string;
  name: string;
  role: string | null;
  birthDate: string | null;
  documentRg: string | null;
  documentCpf: string | null;
  phone: string | null;
  email: string | null;
  restrictions: string | null;
}
export interface ImportedContact {
  name: string;
  company: string | null;
  kind: string;
  region: string | null;
  state: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  link: string | null;
  notes: string | null;
}
export interface ImportedWorkbook {
  shows: ImportedShow[];
  members: ImportedMember[];
  contacts: ImportedContact[];
  settlements: { artist: string; url: string }[];
}

// ---------------- helpers de célula ----------------
const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

function cellText(cell: ExcelJS.Cell): string | null {
  const v = cell.value as unknown;
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    const o = v as { text?: unknown; richText?: { text: string }[]; result?: unknown; hyperlink?: string };
    if (o.richText) return o.richText.map((r) => r.text).join('').trim() || null;
    if (typeof o.text === 'string') return o.text.trim() || null;
    if (o.text && typeof o.text === 'object' && 'richText' in (o.text as object))
      return ((o.text as { richText: { text: string }[] }).richText.map((r) => r.text).join('').trim()) || null;
    if (o.result !== undefined && o.result !== null) return String(o.result).trim() || null;
    return null;
  }
  const s = String(v).trim();
  return s ? s : null;
}
function cellLink(cell: ExcelJS.Cell): string | null {
  const v = cell.value as { hyperlink?: string } | null;
  const link = (v && typeof v === 'object' && 'hyperlink' in v ? v.hyperlink : undefined) ?? cell.hyperlink;
  return link && /^https?:\/\//i.test(link) ? link : null;
}
/** Para colunas de "material": prefere o link; senão o texto (que pode ser URL ou nome de arquivo). */
function cellLinkOrText(cell: ExcelJS.Cell): string | null {
  const t = cellText(cell);
  if (t === '-') return null;
  return cellLink(cell) ?? t;
}
function cellDate(cell: ExcelJS.Cell): string | null {
  const v = cell.value;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const t = cellText(cell);
  const m = t?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`;
  return null;
}

// ---------------- cidade/UF ----------------
const CITY_STATE: Record<string, string> = Object.fromEntries(
  Object.entries({
    SP: 'São Paulo, Diadema, Diabema, Sorocaba, Campinas, Jundiaí, Americana, São Carlos, Lorena, Santo André, Santo Andre, Santos, Taubaté, Taubate, Bragança Paulista',
    RJ: 'Rio de Janeiro, Volta Redonda',
    RS: 'Porto Alegre',
    SC: 'Florianópolis, Florianopolis, Jaraguá do Sul, Balneário Camboriú, Criciúma, Blumenau',
    PR: 'Curitiba, Cascavel, Foz do Iguaçu, Maringá, Maringa, Londrina, Guarapuava',
    MG: 'Belo Horizonte, Uberaba, Uberlândia, Juiz de Fora',
    GO: 'Goiânia',
    DF: 'Brasília',
    ES: 'Vitória, Vitoria, Vila Velha',
    CE: 'Fortaleza',
    PE: 'Recife',
    PB: 'Campina Grande, João Pessoa, Sousa',
    RN: 'Natal, Mossoró, Assú, Pau dos Ferros',
    PA: 'Belém',
    MA: 'São Luís',
  }).flatMap(([uf, cities]) => cities.split(',').map((c) => [norm(c), uf])),
);
export function splitCityState(raw: string | null): { city: string | null; state: string | null } {
  if (!raw) return { city: null, state: null };
  const m = raw.match(/^(.*?)\s*[-/]\s*([A-Z]{2})$/);
  const city = (m ? m[1]! : raw).trim();
  const state = m ? m[2]! : CITY_STATE[norm(city)] ?? null;
  return { city: city === 'Diabema' ? 'Diadema' : city, state };
}

// ---------------- parsers por aba ----------------
const SHOW_COLS: Record<string, keyof ImportedShow | 'contact' | 'cityRaw'> = {
  data: 'date',
  banda: 'artist',
  cidade: 'cityRaw',
  local: 'venue',
  contato: 'contact',
  cartazes: 'posterUrl',
  'link de ingressos': 'ticketUrl',
  'ingressos vendidos': 'ticketsSold',
  'pre producao': 'techSheetUrl',
  'redes sociais': 'socialUrl',
  combinado: 'dealNotes',
  passagens: 'travel',
  hospedagem: 'lodging',
  'lista de equipe': 'crewList',
  'lista de convidados': 'guestList',
};

function parseShowSheet(ws: ExcelJS.Worksheet): ImportedShow[] {
  let header: Record<number, string> | null = null;
  const out: ImportedShow[] = [];
  ws.eachRow((row) => {
    if (!header) {
      const cols: Record<number, string> = {};
      row.eachCell((cell, col) => {
        const key = SHOW_COLS[norm(cellText(cell) ?? '')];
        if (key) cols[col] = key;
      });
      if (Object.values(cols).includes('date') && Object.values(cols).includes('artist')) header = cols;
      return;
    }
    const rec: Record<string, ExcelJS.Cell> = {};
    for (const [col, key] of Object.entries(header)) rec[key] = row.getCell(Number(col));
    const date = rec.date ? cellDate(rec.date) : null;
    const artist = rec.artist ? cellText(rec.artist) : null;
    if (!date || !artist) return; // linhas de mês ("JANEIRO") e vazias
    const { city, state } = splitCityState(rec.cityRaw ? cellText(rec.cityRaw) : null);
    const contact = splitContact(rec.contact ? cellText(rec.contact) : null);
    const soldText = rec.ticketsSold ? cellText(rec.ticketsSold) : null;
    const sold = soldText && /^\d+([.,]\d+)?$/.test(soldText) ? Number(soldText.replace(',', '.')) : NaN;
    const get = (k: string, link = false) => (rec[k] ? (link ? cellLinkOrText(rec[k]!) : cellText(rec[k]!)) : null);
    const dash = (v: string | null) => (v === '-' ? null : v);
    out.push({
      date,
      artist: artist.trim(),
      city,
      state,
      venue: dash(get('venue')),
      venueUrl: rec.venue ? cellLink(rec.venue) : null,
      contactName: contact.name,
      contactPhone: contact.phone,
      posterUrl: dash(get('posterUrl', true)),
      ticketUrl: dash(get('ticketUrl', true)),
      ticketsSold: Number.isFinite(sold) ? Math.round(sold) : null,
      techSheetUrl: dash(get('techSheetUrl', true)),
      socialUrl: dash(get('socialUrl', true)),
      dealNotes: dash(get('dealNotes')),
      travel: dash(get('travel', true)),
      lodging: dash(get('lodging', true)),
      crewList: dash(get('crewList', true)),
      guestList: dash(get('guestList', true)),
    });
  });
  return out;
}

function parseMembers(ws: ExcelJS.Worksheet): ImportedMember[] {
  const out: ImportedMember[] = [];
  let current: string | null = null;
  ws.eachRow((row) => {
    const a = cellText(row.getCell(1));
    const b = cellText(row.getCell(2));
    if (b && norm(b) === 'funcao') {
      current = a;
      return;
    }
    if (!current || !a) return;
    const birth = cellDate(row.getCell(3));
    out.push({
      artist: current,
      name: a,
      role: b,
      birthDate: birth,
      documentRg: cellText(row.getCell(4)),
      documentCpf: cellText(row.getCell(5)),
      phone: cellText(row.getCell(6)),
      email: cellText(row.getCell(7)),
      restrictions: cellText(row.getCell(9)),
    });
  });
  return out;
}

function guessKind(company: string | null): string {
  const c = norm(company ?? '');
  if (/fest|festival|bananada|dosol|spim/.test(c)) return 'FESTIVAL';
  if (/coletiv|circuito/.test(c)) return 'COLLECTIVE';
  if (!c) return 'PRODUCER';
  return 'VENUE';
}

function parseContacts(ws: ExcelJS.Worksheet): ImportedContact[] {
  const out: ImportedContact[] = [];
  let started = false;
  ws.eachRow((row) => {
    if (!started) {
      started = norm(cellText(row.getCell(1)) ?? '') === 'regiao';
      return;
    }
    const name = cellText(row.getCell(5));
    const company = cellText(row.getCell(4));
    if (!name && !company) return;
    const state = cellText(row.getCell(2))?.toUpperCase() ?? null;
    out.push({
      name: name ?? company!,
      company,
      kind: guessKind(company),
      region: state ? REGION_BY_STATE[state] ?? cellText(row.getCell(1)) : cellText(row.getCell(1)),
      state,
      city: cellText(row.getCell(3)),
      phone: cellText(row.getCell(6)),
      email: cellText(row.getCell(7)),
      instagram: cellText(row.getCell(8)),
      link: cellLinkOrText(row.getCell(9)),
      notes: null,
    });
  });
  return out;
}

/** Lista de contatos de evento (seções em B, linhas: função | nome | e-mail | telefone). */
function parseEventContacts(ws: ExcelJS.Worksheet): ImportedContact[] {
  const out: ImportedContact[] = [];
  let title: string | null = null;
  let section: string | null = null;
  ws.eachRow((row) => {
    const b = cellText(row.getCell(2));
    const c = cellText(row.getCell(3));
    if (b && !c) {
      if (!title) title = b;
      else section = b;
      return;
    }
    if (!b || !c) return;
    const isBand = section && norm(section) === 'bandas';
    out.push({
      name: c,
      company: isBand ? b : section,
      kind: isBand ? 'PRODUCER' : 'OTHER',
      region: null,
      state: null,
      city: null,
      email: cellText(row.getCell(4)),
      phone: cellText(row.getCell(5)),
      instagram: null,
      link: null,
      notes: [title, section, isBand ? null : b].filter(Boolean).join(' · '),
    });
  });
  return out;
}

function parseSettlements(ws: ExcelJS.Worksheet): { artist: string; url: string }[] {
  const out: { artist: string; url: string }[] = [];
  let pending: string | null = null;
  ws.eachRow((row) => {
    const cell = row.getCell(1);
    const t = cellText(cell);
    const url = cellLink(cell) ?? (t && /^https?:\/\//.test(t) ? t : null);
    if (url && pending) {
      out.push({ artist: pending, url });
      pending = null;
    } else if (t && !url) pending = t;
  });
  return out;
}

export async function parseGreenWaveWorkbook(input: ArrayBuffer | Buffer): Promise<ImportedWorkbook> {
  const wb = new ExcelJS.Workbook();
  // exceljs aceita Buffer/ArrayBuffer
  await wb.xlsx.load(input as ArrayBuffer);
  const result: ImportedWorkbook = { shows: [], members: [], contacts: [], settlements: [] };
  wb.eachSheet((ws) => {
    const n = norm(ws.name);
    if (n.startsWith('shows')) result.shows.push(...parseShowSheet(ws));
    else if (n.includes('dados das bandas')) result.members.push(...parseMembers(ws));
    else if (n === 'contatos') result.contacts.push(...parseContacts(ws));
    else if (n.includes('lista de contatos')) result.contacts.push(...parseEventContacts(ws));
    else if (n.includes('fechamento')) result.settlements.push(...parseSettlements(ws));
  });
  return result;
}

/** Remove dados pessoais sensíveis (para seeds versionados / demos). */
export function sanitizeWorkbook(data: ImportedWorkbook): ImportedWorkbook {
  return {
    shows: data.shows.map((s) => ({ ...s, contactPhone: null })),
    members: [],
    contacts: data.contacts.map((c) => ({ ...c, phone: null, email: null })),
    settlements: data.settlements,
  };
}

// ---------------- persistência ----------------
export interface ImportSummary {
  artistsCreated: number;
  showsCreated: number;
  showsUpdated: number;
  membersCreated: number;
  contactsCreated: number;
  settlementsLinked: number;
}

const ALIAS = new Map<string, string>();
for (const c of CASTING_2026) {
  ALIAS.set(slugify(c.name), slugify(c.name));
  for (const a of c.aliases ?? []) ALIAS.set(slugify(a), slugify(c.name));
}

export async function importIntoOrganization(
  db: PrismaClient,
  organizationId: string,
  data: ImportedWorkbook,
  today = new Date(),
): Promise<ImportSummary> {
  const summary: ImportSummary = { artistsCreated: 0, showsCreated: 0, showsUpdated: 0, membersCreated: 0, contactsCreated: 0, settlementsLinked: 0 };
  const artists = await db.artist.findMany({ where: { organizationId }, select: { id: true, slug: true } });
  const bySlug = new Map(artists.map((a) => [a.slug, a.id]));

  async function artistId(name: string): Promise<string> {
    const raw = slugify(name);
    const slug = ALIAS.get(raw) ?? raw;
    const found = bySlug.get(slug);
    if (found) return found;
    const created = await db.artist.create({ data: { organizationId, name: name.trim(), slug } });
    summary.artistsCreated++;
    bySlug.set(slug, created.id);
    return created.id;
  }

  // Contatos primeiro, para vincular aos shows
  const existingContacts = await db.contact.findMany({ where: { organizationId }, select: { name: true, company: true, city: true } });
  const contactKey = (n: string, c: string | null, city: string | null) => `${slugify(n)}|${slugify(c ?? '')}|${slugify(city ?? '')}`;
  const contactSeen = new Set(existingContacts.map((c) => contactKey(c.name, c.company, c.city)));
  for (const c of data.contacts) {
    const key = contactKey(c.name, c.company, c.city);
    if (contactSeen.has(key)) continue;
    contactSeen.add(key);
    await db.contact.create({ data: { organizationId, ...c } });
    summary.contactsCreated++;
  }

  const todayIso = today.toISOString().slice(0, 10);
  for (const s of data.shows) {
    const aId = await artistId(s.artist);
    const deal = parseDeal(s.dealNotes);
    const date = new Date(`${s.date}T12:00:00.000Z`);
    const fields = {
      city: s.city,
      state: s.state,
      venue: s.venue,
      venueUrl: s.venueUrl,
      contactName: [s.contactName, s.contactPhone].filter(Boolean).join(' · ') || null,
      posterUrl: s.posterUrl,
      ticketUrl: s.ticketUrl,
      ticketsSold: s.ticketsSold,
      techSheetUrl: s.techSheetUrl,
      socialUrl: s.socialUrl,
      dealNotes: s.dealNotes,
      dealType: deal.dealType,
      fee: deal.fee,
      doorPercent: deal.doorPercent,
      hospitality: deal.hospitality,
      travel: s.travel,
      lodging: s.lodging,
      crewList: s.crewList,
      guestList: s.guestList,
      chkPoster: !!s.posterUrl,
      chkTickets: !!s.ticketUrl,
      chkTechSheet: !!s.techSheetUrl,
      chkSocial: !!s.socialUrl,
      chkTravel: !!s.travel,
      chkLodging: !!s.lodging,
      chkCrewList: !!s.crewList,
      chkGuests: !!s.guestList,
    };
    const existing = await db.show.findFirst({
      where: { organizationId, artistId: aId, date, ...(s.venue ? { venue: s.venue } : { city: s.city }) },
      select: { id: true },
    });
    if (existing) {
      await db.show.update({ where: { id: existing.id }, data: fields });
      summary.showsUpdated++;
    } else {
      await db.show.create({
        data: { organizationId, artistId: aId, date, status: s.date < todayIso ? 'DONE' : 'CONFIRMED', ...fields },
      });
      summary.showsCreated++;
    }
  }

  for (const m of data.members) {
    if (slugify(m.artist) === 'green-wave') continue; // equipe interna vira usuário, não integrante
    const aId = await artistId(m.artist);
    const exists = await db.artistMember.findFirst({ where: { artistId: aId, name: m.name }, select: { id: true } });
    const { artist: _ignored, birthDate, ...rest } = m;
    void _ignored;
    const data2 = { ...rest, birthDate: birthDate ? new Date(`${birthDate}T12:00:00.000Z`) : null };
    if (exists) await db.artistMember.update({ where: { id: exists.id }, data: data2 });
    else {
      await db.artistMember.create({ data: { artistId: aId, ...data2 } });
      summary.membersCreated++;
    }
  }

  for (const st of data.settlements) {
    if (/cart[aã]o/i.test(st.artist)) continue;
    const aId = await artistId(st.artist);
    await db.artist.update({ where: { id: aId }, data: { settlementUrl: st.url } });
    summary.settlementsLinked++;
  }

  return summary;
}
