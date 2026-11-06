import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import utc from 'dayjs/plugin/utc';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(utc);
dayjs.extend(relativeTime);
dayjs.locale('pt-br');

export { dayjs };

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const brl2 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Centavos -> "R$ 2.500" */
export function money(cents: number | null | undefined, precise = false): string {
  if (cents === null || cents === undefined) return '—';
  return (precise ? brl2 : brl).format(cents / 100);
}
/** Centavos -> "2500,00" para inputs */
export function moneyToInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '';
  return (cents / 100).toFixed(2).replace('.', ',');
}
/** Datas de shows são "dias de calendário": armazenadas ao meio-dia UTC para não mudar de dia por fuso. */
export function toCalendarDate(isoDay: string): Date {
  return new Date(`${isoDay.slice(0, 10)}T12:00:00.000Z`);
}
export function toInputDate(d: Date | string | null | undefined): string {
  if (!d) return '';
  return dayjs.utc(d).format('YYYY-MM-DD');
}
export function fmtDate(d: Date | string | null | undefined, pattern = 'DD/MM/YYYY'): string {
  if (!d) return '—';
  return dayjs.utc(d).format(pattern);
}
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}
export function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
export function instagramUrl(handle: string | null | undefined): string | null {
  if (!handle) return null;
  if (handle.startsWith('http')) return handle;
  return `https://instagram.com/${handle.replace(/^@/, '')}`;
}
export function isUrl(v: string | null | undefined): v is string {
  return !!v && /^https?:\/\//i.test(v.trim());
}
