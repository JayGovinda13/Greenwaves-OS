'use client';
import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { RefreshDouble } from 'iconoir-react';
import { addTicketReport } from '@/app/(app)/shows/actions';
import { TICKETS_STALE_DAYS, TICKET_SOURCE_LABEL, type TicketSource } from '@/lib/domain';
import { dayjs, money } from '@/lib/format';
import { useFormAction } from '@/components/ui/useFormAction';

export interface TicketReportItem {
  id: string;
  sold: number;
  source: string;
  note: string | null;
  reportedAt: string;
  reportedBy: string | null;
}

const SOURCES: TicketSource[] = ['PLATFORM', 'PROMOTER', 'ESTIMATE'];

export function TicketSalesCard({ showId, showDate, capacity, ticketPrice, reports, canEdit }: {
  showId: string;
  showDate: string;
  capacity: number | null;
  ticketPrice: number | null;
  reports: TicketReportItem[]; // mais recente primeiro
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { submit, pending, err } = useFormAction((fd) => addTicketReport(showId, fd), () => setOpen(false));
  const last = reports[0];
  const sold = last?.sold ?? null;
  const occupancy = sold !== null && capacity ? Math.min(100, (sold / capacity) * 100) : null;
  const gross = sold !== null && ticketPrice ? sold * ticketPrice : null;
  const upcoming = !dayjs.utc(showDate).isBefore(dayjs.utc(dayjs().format('YYYY-MM-DD')), 'day');
  const ageDays = last ? dayjs().diff(dayjs(last.reportedAt), 'day') : null;
  const stale = upcoming && (ageDays === null || ageDays >= TICKETS_STALE_DAYS);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="overline" color="text.secondary">Ingressos vendidos</Typography>
          <Typography variant="h3" component="div">
            {sold ?? '—'}
            {capacity ? <Typography component="span" color="text.secondary" fontWeight={600}> / {capacity}</Typography> : null}
          </Typography>
          <Typography variant="body2" color={stale ? 'warning.main' : 'text.secondary'} fontWeight={stale ? 700 : 400}>
            {last
              ? `Atualizado ${dayjs(last.reportedAt).fromNow()}${last.reportedBy ? ` por ${last.reportedBy}` : ''} · ${TICKET_SOURCE_LABEL[last.source as TicketSource] ?? last.source}`
              : 'Nenhuma atualização de vendas ainda'}
          </Typography>
        </Box>
        {canEdit && (
          <Button variant={stale ? 'contained' : 'outlined'} color={stale ? 'secondary' : 'primary'} startIcon={<RefreshDouble />} onClick={() => setOpen(true)}>
            Atualizar vendas
          </Button>
        )}
      </Box>

      {stale && last && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Sem atualização há {ageDays} dias. O número pode não refletir as vendas atuais: confirme com o contratante ou no painel da plataforma.
        </Alert>
      )}

      {occupancy !== null && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress variant="determinate" value={occupancy} color="secondary" sx={{ height: 10, borderRadius: 5 }} />
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            {occupancy.toFixed(0)}% da capacidade{gross ? ` · bruto estimado ${money(gross)}` : ''}
          </Typography>
        </Box>
      )}

      {reports.length > 1 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="overline" color="text.secondary">Histórico</Typography>
          {reports.slice(0, 8).map((r, i) => {
            const prev = reports[i + 1];
            const delta = prev ? r.sold - prev.sold : null;
            return (
              <Box key={r.id} sx={{ display: 'flex', gap: 2, py: 0.75, borderTop: 1, borderColor: 'divider', fontSize: 14 }}>
                <Typography fontSize={13} color="text.secondary" sx={{ width: 90, flexShrink: 0 }}>{dayjs(r.reportedAt).format('DD/MM HH:mm')}</Typography>
                <Typography fontSize={14} fontWeight={800} sx={{ width: 56 }}>{r.sold}</Typography>
                <Typography fontSize={13} sx={{ width: 50, color: delta && delta > 0 ? 'success.main' : 'text.secondary' }}>
                  {delta !== null ? (delta >= 0 ? `+${delta}` : delta) : ''}
                </Typography>
                <Typography fontSize={13} color="text.secondary" noWrap sx={{ flex: 1 }}>
                  {[TICKET_SOURCE_LABEL[r.source as TicketSource], r.reportedBy, r.note].filter(Boolean).join(' · ')}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}

      {open && (
        <Dialog open onClose={() => setOpen(false)} maxWidth="xs" fullWidth slotProps={{ paper: { component: 'form', onSubmit: submit } as object }}>
          <DialogTitle>Atualizar vendas</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField name="sold" type="number" label="Ingressos vendidos até agora" required autoFocus defaultValue={sold ?? ''} slotProps={{ htmlInput: { min: 0 } }} {...err('sold')} />
              <TextField select name="source" label="De onde veio o número?" defaultValue="PROMOTER">
                {SOURCES.map((s) => <MenuItem key={s} value={s}>{TICKET_SOURCE_LABEL[s]}</MenuItem>)}
              </TextField>
              <TextField name="note" label="Observação (opcional)" placeholder="Ex.: inclui lista de meia-entrada" />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={pending}>Salvar</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
