import { money } from '@/lib/format';

export function dealLabel(s: { dealType: string; fee: number | null; doorPercent: number | null; dealNotes?: string | null }): string {
  switch (s.dealType) {
    case 'FIXED':
      return s.fee ? money(s.fee) : 'Cachê fixo';
    case 'DOOR':
      return `${s.doorPercent ?? 100}% bilheteria`;
    case 'GUARANTEE_OR_DOOR':
      return `${money(s.fee)} ou ${s.doorPercent ?? 100}%`;
    case 'FREE':
      return 'Entrada franca';
    default:
      return s.dealNotes ? 'Ver combinado' : 'A definir';
  }
}
