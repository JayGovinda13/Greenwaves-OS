'use client';
import { useOptimistic, useTransition } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { toggleChecklist } from '@/app/(app)/shows/actions';
import { SHOW_CHECKLIST, type ChecklistKey } from '@/lib/domain';
import { useToast } from '@/components/ui/Toast';

export function ShowChecklist({ show, canEdit }: { show: { id: string } & Record<ChecklistKey, boolean>; canEdit: boolean }) {
  const initial = Object.fromEntries(SHOW_CHECKLIST.map((c) => [c.key, show[c.key]])) as Record<ChecklistKey, boolean>;
  const [state, setOptimistic] = useOptimistic(initial, (s, [k, v]: [ChecklistKey, boolean]) => ({ ...s, [k]: v }));
  const [, start] = useTransition();
  const toast = useToast();
  const done = Object.values(state).filter(Boolean).length;
  return (
    <Card sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Typography variant="h5">Checklist de produção</Typography>
        <Typography fontWeight={800} color="primary.main">{done}/{SHOW_CHECKLIST.length}</Typography>
      </Box>
      <LinearProgress variant="determinate" value={(done / SHOW_CHECKLIST.length) * 100} color={done === SHOW_CHECKLIST.length ? 'success' : 'secondary'} sx={{ height: 8, borderRadius: 4, my: 2 }} />
      {SHOW_CHECKLIST.map((c) => (
        <Box
          key={c.key}
          component="label"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, py: 0.25, cursor: canEdit ? 'pointer' : 'default', borderRadius: 2, '&:hover': canEdit ? { bgcolor: 'action.hover' } : undefined }}
        >
          <Checkbox
            checked={state[c.key]}
            disabled={!canEdit}
            color="primary"
            onChange={(e) => {
              const v = e.target.checked;
              start(async () => {
                setOptimistic([c.key, v]);
                const r = await toggleChecklist(show.id, c.key, v);
                if (!r.ok) toast(r.error, 'error');
              });
            }}
          />
          <Typography sx={{ fontWeight: 600, textDecoration: state[c.key] ? 'line-through' : 'none', opacity: state[c.key] ? 0.6 : 1 }}>{c.label}</Typography>
        </Box>
      ))}
    </Card>
  );
}
