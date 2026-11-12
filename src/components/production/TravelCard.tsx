'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { EditPencil, Plus, Xmark } from 'iconoir-react';
import { deleteTravelLeg, saveTravelLeg } from '@/app/(app)/shows/actions';
import { TRAVEL_DIRECTIONS, TRAVEL_DIRECTION_LABEL, TRAVEL_MODES, TRAVEL_MODE_LABEL } from '@/lib/production';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { useToast } from '@/components/ui/Toast';

export interface TravelLegRow {
  id: string; mode: string; direction: string; passengers: string | null; company: string | null; code: string | null;
  origin: string; destination: string; date: string; departure: string | null; arrival: string | null; boarding: string | null;
  tickets: { label: string; url: string }[]; notes: string | null;
}

type Draft = Omit<TravelLegRow, 'id'>;
const blank = (date: string): Draft => ({
  mode: 'BUS', direction: 'IDA', passengers: '', company: '', code: '', origin: '', destination: '', date, departure: '', arrival: '', boarding: '', tickets: [], notes: '',
});

function LegDialog({ artistId, leg, showDay, onClose }: { artistId: string; leg?: TravelLegRow; showDay: string; onClose: () => void }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [v, setV] = useState<Draft>(leg ? { ...leg } : blank(showDay));
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });
  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{leg ? 'Editar deslocamento' : 'Novo deslocamento'}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(6, 1fr)' }, gap: 2 }}>
          <TextField select label="Meio" value={v.mode} onChange={set('mode')} sx={{ gridColumn: 'span 2' }}>
            {TRAVEL_MODES.map((m) => <MenuItem key={m} value={m}>{TRAVEL_MODE_LABEL[m]}</MenuItem>)}
          </TextField>
          <TextField select label="Sentido" value={v.direction} onChange={set('direction')} sx={{ gridColumn: 'span 1' }}>
            {TRAVEL_DIRECTIONS.map((d) => <MenuItem key={d} value={d}>{TRAVEL_DIRECTION_LABEL[d]}</MenuItem>)}
          </TextField>
          <TextField label="Quem viaja" placeholder="João, Paulo e Raony" value={v.passengers ?? ''} onChange={set('passengers')} sx={{ gridColumn: 'span 3' }} />
          <TextField label="Companhia / viação" placeholder="Catarinense" value={v.company ?? ''} onChange={set('company')} sx={{ gridColumn: 'span 2' }} />
          <TextField label="Linha / voo" value={v.code ?? ''} onChange={set('code')} sx={{ gridColumn: 'span 1' }} />
          <TextField label="Origem" placeholder="Barra Funda" required value={v.origin} onChange={set('origin')} sx={{ gridColumn: 'span 3' }} />
          <TextField label="Destino" placeholder="Maringá" required value={v.destination} onChange={set('destination')} sx={{ gridColumn: 'span 3' }} />
          <TextField type="date" label="Data" required value={v.date} onChange={set('date')} slotProps={{ inputLabel: { shrink: true } }} sx={{ gridColumn: 'span 3' }} />
          <TextField type="time" label="Embarque" value={v.boarding ?? ''} onChange={set('boarding')} slotProps={{ inputLabel: { shrink: true } }} sx={{ gridColumn: 'span 1' }} />
          <TextField type="time" label="Saída" value={v.departure ?? ''} onChange={set('departure')} slotProps={{ inputLabel: { shrink: true } }} sx={{ gridColumn: 'span 1' }} />
          <TextField type="time" label="Chegada" value={v.arrival ?? ''} onChange={set('arrival')} slotProps={{ inputLabel: { shrink: true } }} sx={{ gridColumn: 'span 1' }} />
        </Box>
        <Typography variant="overline" color="primary.main" sx={{ display: 'block', mt: 3 }}>Bilhetes (links)</Typography>
        {v.tickets.map((t, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField label="Nome" placeholder="Passagens João" value={t.label} onChange={(e) => setV({ ...v, tickets: v.tickets.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} sx={{ flex: 1 }} />
            <TextField label="Link" placeholder="https://…" value={t.url} onChange={(e) => setV({ ...v, tickets: v.tickets.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} sx={{ flex: 2 }} />
            <IconButton color="error" onClick={() => setV({ ...v, tickets: v.tickets.filter((_, j) => j !== i) })} aria-label="Remover"><Xmark /></IconButton>
          </Box>
        ))}
        <Button size="small" startIcon={<Plus />} onClick={() => setV({ ...v, tickets: [...v.tickets, { label: '', url: '' }] })}>Bilhete</Button>
        <TextField label="Observações" multiline minRows={2} value={v.notes ?? ''} onChange={set('notes')} sx={{ mt: 2 }} />
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          disabled={pending}
          onClick={() => start(async () => {
            const r = await saveTravelLeg(artistId, leg?.id ?? null, v);
            toast(r.ok ? r.message! : r.error, r.ok ? 'success' : 'error');
            if (r.ok) { onClose(); router.refresh(); }
          })}
        >
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function TravelCard({ artistId, showDay, legs, canEdit }: { artistId: string; showDay: string; legs: TravelLegRow[]; canEdit: boolean }) {
  const [editing, setEditing] = useState<TravelLegRow | 'new' | null>(null);
  return (
    <Card sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1 }}>
        <Box>
          <Typography variant="h5">Deslocamentos</Typography>
          <Typography variant="body2" color="text.secondary">Ônibus, voos e vans da banda nesta data. Entram na ficha técnica.</Typography>
        </Box>
        {canEdit && <Button size="small" startIcon={<Plus />} onClick={() => setEditing('new')}>Deslocamento</Button>}
      </Box>
      {legs.length === 0 && <Typography color="text.secondary" mt={2} fontSize={14}>Nenhum deslocamento cadastrado perto desta data.</Typography>}
      {legs.map((l) => (
        <Box key={l.id} sx={{ display: 'flex', gap: 1.5, alignItems: 'center', py: 1.25, borderTop: 1, borderColor: 'divider', mt: 1 }}>
          <Chip size="small" color="secondary" label={TRAVEL_MODE_LABEL[l.mode as keyof typeof TRAVEL_MODE_LABEL] ?? l.mode} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography fontWeight={800} noWrap>{l.origin} → {l.destination}</Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {l.date.split('-').reverse().slice(0, 2).join('/')} · {TRAVEL_DIRECTION_LABEL[l.direction as keyof typeof TRAVEL_DIRECTION_LABEL]}
              {l.boarding ? ` · embarque ${l.boarding}` : ''}{l.departure ? ` · saída ${l.departure}` : ''}{l.passengers ? ` · ${l.passengers}` : ''}
            </Typography>
          </Box>
          {canEdit && (
            <>
              <Tooltip title="Editar"><IconButton size="small" onClick={() => setEditing(l)}><EditPencil width={18} /></IconButton></Tooltip>
              <ConfirmButton iconOnly label="Remover" title="Remover este deslocamento?" onConfirm={() => deleteTravelLeg(l.id)} />
            </>
          )}
        </Box>
      ))}
      {editing && <LegDialog artistId={artistId} showDay={showDay} leg={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}
