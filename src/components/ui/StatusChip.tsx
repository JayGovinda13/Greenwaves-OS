import Chip from '@mui/material/Chip';
import { receivableState } from '@/lib/receivables';
import { SHOW_STATUS_COLOR, SHOW_STATUS_LABEL, TX_STATUS_LABEL, type ShowStatus, type TxStatus } from '@/lib/domain';

export function ShowStatusChip({ status }: { status: string }) {
  const s = status as ShowStatus;
  return <Chip size="small" label={SHOW_STATUS_LABEL[s] ?? status} color={SHOW_STATUS_COLOR[s] ?? 'default'} variant={s === 'CONFIRMED' ? 'filled' : 'outlined'} />;
}

export function TxStatusChip({ status, dueDate, date, paidAt }: { status: string; dueDate?: Date | string | null; date?: Date | string; paidAt?: Date | string | null }) {
  if (date !== undefined) {
    const st = receivableState({ status, dueDate: dueDate ?? null, date, paidAt });
    if (st === 'OVERDUE') return <Chip size="small" label="Atrasado" color="error" />;
    if (st === 'PAID_LATE') return <Chip size="small" label="Pago com atraso" color="warning" variant="outlined" />;
  }
  const s = status as TxStatus;
  const color = s === 'PAID' ? 'success' : s === 'PENDING' ? 'warning' : 'default';
  return <Chip size="small" label={TX_STATUS_LABEL[s] ?? status} color={color} variant="outlined" />;
}
