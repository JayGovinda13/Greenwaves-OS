import Chip from '@mui/material/Chip';
import { SHOW_STATUS_COLOR, SHOW_STATUS_LABEL, TX_STATUS_LABEL, type ShowStatus, type TxStatus } from '@/lib/domain';

export function ShowStatusChip({ status }: { status: string }) {
  const s = status as ShowStatus;
  return <Chip size="small" label={SHOW_STATUS_LABEL[s] ?? status} color={SHOW_STATUS_COLOR[s] ?? 'default'} variant={s === 'CONFIRMED' ? 'filled' : 'outlined'} />;
}

export function TxStatusChip({ status }: { status: string }) {
  const s = status as TxStatus;
  const color = s === 'PAID' ? 'success' : s === 'PENDING' ? 'warning' : 'default';
  return <Chip size="small" label={TX_STATUS_LABEL[s] ?? status} color={color} variant="outlined" />;
}
