'use client';
import { useState, useTransition } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { EditPencil, Printer } from 'iconoir-react';
import { deleteShow, setShowStatus } from '@/app/(app)/shows/actions';
import { SHOW_STATUS, SHOW_STATUS_LABEL, type ShowStatus } from '@/lib/domain';
import { BRAND } from '@/theme/brand';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { useToast } from '@/components/ui/Toast';
import { ShowFormDialog, type ShowFormValues } from './ShowFormDialog';

export function ShowHeaderActions({ show, artists, contacts, canEdit, canDelete }: {
  show: ShowFormValues & { id: string; status: string };
  artists: { id: string; name: string }[];
  contacts: { id: string; name: string; company: string | null; city: string | null }[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const onDark = {
    '& .MuiOutlinedInput-root': { color: BRAND.cream, bgcolor: 'rgba(255,255,255,.08)' },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,247,234,.35)' },
    '& .MuiInputLabel-root, & .MuiSvgIcon-root': { color: BRAND.cream },
  };
  return (
    <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap', alignItems: 'center' }}>
      <TextField
        select
        size="small"
        label="Status"
        value={show.status}
        disabled={!canEdit || pending}
        onChange={(e) =>
          start(async () => {
            const r = await setShowStatus(show.id, e.target.value as ShowStatus);
            toast(r.ok ? r.message ?? 'Atualizado' : r.error, r.ok ? 'success' : 'error');
          })
        }
        sx={{ minWidth: 160, ...onDark }}
        fullWidth={false}
      >
        {SHOW_STATUS.map((s) => <MenuItem key={s} value={s}>{SHOW_STATUS_LABEL[s]}</MenuItem>)}
      </TextField>
      <Button
        component="a"
        href={`/imprimir/roadbook/${show.id}`}
        target="_blank"
        variant="outlined"
        startIcon={<Printer />}
        sx={{ color: BRAND.cream, borderColor: 'rgba(255,247,234,.4)' }}
      >
        Exportar roadbook
      </Button>
      {canEdit && (
        <Button variant="contained" color="secondary" startIcon={<EditPencil />} onClick={() => setOpen(true)}>
          Editar
        </Button>
      )}
      {canDelete && (
        <ConfirmButton
          title="Excluir show?"
          description="O show e seu checklist serão removidos. Lançamentos financeiros vinculados são mantidos, sem vínculo."
          onConfirm={() => deleteShow(show.id)}
          buttonProps={{ sx: { color: BRAND.cream, borderColor: 'rgba(255,247,234,.4)' } }}
        />
      )}
      {open && <ShowFormDialog open onClose={() => setOpen(false)} initial={show} artists={artists} contacts={contacts} />}
    </Box>
  );
}
