'use client';
import { useOptimistic, useState, useTransition } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { EditPencil, MagicWand, Plus } from 'iconoir-react';
import { deleteScheduleItem, generateSchedule, saveScheduleItem, toggleScheduleItem } from '@/app/(app)/shows/actions';
import { SCHEDULE_KINDS, SCHEDULE_KIND_LABEL, type ScheduleKind } from '@/lib/domain';
import { dayjs } from '@/lib/format';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { F, FormSection } from '@/components/ui/FormSection';
import { useFormAction } from '@/components/ui/useFormAction';
import { useToast } from '@/components/ui/Toast';

export interface ScheduleItem {
  id: string;
  kind: string;
  day: string;
  time: string;
  title: string | null;
  location: string | null;
  notes: string | null;
  done: boolean;
}

const KEY_KINDS: ScheduleKind[] = ['DEPARTURE', 'CHECK_IN', 'SET', 'CHECK_OUT'];

function ItemDialog({ showId, showDay, item, onClose }: { showId: string; showDay: string; item?: ScheduleItem; onClose: () => void }) {
  const { submit, pending, err } = useFormAction((fd) => saveScheduleItem(showId, item?.id ?? null, fd), onClose);
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { component: 'form', onSubmit: submit } as object }}>
      <DialogTitle>{item ? 'Editar horário' : 'Novo horário'}</DialogTitle>
      <DialogContent dividers>
        <FormSection title="Quando">
          <F span={3}>
            <TextField select name="kind" label="Tipo" defaultValue={item?.kind ?? 'OTHER'}>
              {SCHEDULE_KINDS.map((k) => <MenuItem key={k} value={k}>{SCHEDULE_KIND_LABEL[k]}</MenuItem>)}
            </TextField>
          </F>
          <F span={2}><TextField type="date" name="day" label="Dia" required defaultValue={item?.day ?? showDay} slotProps={{ inputLabel: { shrink: true } }} {...err('day')} /></F>
          <F span={1}><TextField type="time" name="time" label="Hora" required defaultValue={item?.time ?? ''} slotProps={{ inputLabel: { shrink: true } }} {...err('time')} /></F>
        </FormSection>
        <FormSection title="Detalhes">
          <F span={3}><TextField name="title" label="Descrição (opcional)" placeholder="Ex.: Voo G3 1234" defaultValue={item?.title ?? ''} /></F>
          <F span={3}><TextField name="location" label="Local (opcional)" placeholder="Ex.: Aeroporto de Congonhas" defaultValue={item?.location ?? ''} /></F>
          <F span={6}><TextField name="notes" label="Observações (opcional)" multiline minRows={2} defaultValue={item?.notes ?? ''} /></F>
        </FormSection>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="contained" disabled={pending}>Salvar</Button>
      </DialogActions>
    </Dialog>
  );
}

export function ScheduleCard({ showId, showDay, items, canEdit }: { showId: string; showDay: string; items: ScheduleItem[]; canEdit: boolean }) {
  const toast = useToast();
  const [editing, setEditing] = useState<ScheduleItem | 'new' | null>(null);
  const [pending, start] = useTransition();
  const [list, setDone] = useOptimistic(items, (s, [id, done]: [string, boolean]) => s.map((i) => (i.id === id ? { ...i, done } : i)));
  const sorted = [...list].sort((a, b) => `${a.day} ${a.time}`.localeCompare(`${b.day} ${b.time}`));
  const days = [...new Set(sorted.map((i) => i.day))];
  const done = list.filter((i) => i.done).length;

  return (
    <Card sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', mb: 1 }}>
        <Box>
          <Typography variant="h5">Roteiro do dia</Typography>
          <Typography variant="body2" color="text.secondary">
            {list.length ? `${done}/${list.length} etapas cumpridas` : 'Embarque, check-in, passagem de som, show, check-out…'}
          </Typography>
        </Box>
        {canEdit && list.length > 0 && (
          <Button size="small" startIcon={<Plus />} onClick={() => setEditing('new')}>Horário</Button>
        )}
      </Box>

      {list.length === 0 && canEdit && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<MagicWand />}
            disabled={pending}
            onClick={() => start(async () => { const r = await generateSchedule(showId); toast(r.ok ? r.message! : r.error, r.ok ? 'success' : 'error'); })}
          >
            Gerar roteiro padrão
          </Button>
          <Button variant="outlined" startIcon={<Plus />} onClick={() => setEditing('new')}>Adicionar horário</Button>
          <Typography variant="body2" color="text.secondary" sx={{ width: '100%', mt: 0.5 }}>
            O roteiro padrão considera se o artista viaja e o tempo estimado de estrada a partir do show anterior ou da cidade-base.
          </Typography>
        </Box>
      )}

      {days.map((day) => (
        <Box key={day} sx={{ mt: 2 }}>
          <Typography variant="overline" sx={{ color: 'primary.main' }}>
            {dayjs(day).format('dddd, DD/MM')}{day !== showDay ? (day < showDay ? ' · véspera' : ' · dia seguinte') : ' · dia do show'}
          </Typography>
          {sorted.filter((i) => i.day === day).map((i) => {
            const key = KEY_KINDS.includes(i.kind as ScheduleKind);
            return (
              <Box key={i.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, py: 0.75, borderTop: 1, borderColor: 'divider' }}>
                <Checkbox
                  size="small"
                  checked={i.done}
                  disabled={!canEdit}
                  sx={{ mt: -0.5 }}
                  onChange={(e) => {
                    const v = e.target.checked;
                    start(async () => {
                      setDone([i.id, v]);
                      const r = await toggleScheduleItem(showId, i.id, v);
                      if (!r.ok) toast(r.error, 'error');
                    });
                  }}
                />
                <Typography sx={{ width: 52, flexShrink: 0, fontWeight: 900, fontFamily: 'var(--font-display)', fontStretch: '125%', color: key ? 'primary.main' : 'text.primary' }}>
                  {i.time}
                </Typography>
                <Box sx={{ flex: 1, minWidth: 0, opacity: i.done ? 0.55 : 1 }}>
                  <Typography fontWeight={key ? 800 : 600} sx={{ textDecoration: i.done ? 'line-through' : 'none' }}>
                    {SCHEDULE_KIND_LABEL[i.kind as ScheduleKind] ?? i.kind}{i.title ? ` · ${i.title}` : ''}
                  </Typography>
                  {(i.location || i.notes) && (
                    <Typography variant="body2" color="text.secondary">{[i.location, i.notes].filter(Boolean).join(' — ')}</Typography>
                  )}
                </Box>
                {canEdit && (
                  <>
                    <Tooltip title="Editar"><IconButton size="small" onClick={() => setEditing(i)}><EditPencil width={18} /></IconButton></Tooltip>
                    <ConfirmButton iconOnly label="Remover" title="Remover este horário?" onConfirm={() => deleteScheduleItem(showId, i.id)} />
                  </>
                )}
              </Box>
            );
          })}
        </Box>
      ))}

      {editing && <ItemDialog showId={showId} showDay={showDay} item={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}
