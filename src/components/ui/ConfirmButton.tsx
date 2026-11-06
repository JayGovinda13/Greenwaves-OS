'use client';
import { useState, useTransition } from 'react';
import Button, { type ButtonProps } from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { Trash } from 'iconoir-react';
import { useToast } from './Toast';
import type { ActionResult } from '@/lib/action';

export function ConfirmButton({
  title, description, onConfirm, label = 'Excluir', iconOnly, buttonProps,
}: {
  title: string;
  description?: string;
  onConfirm: () => Promise<ActionResult<unknown>>;
  label?: string;
  iconOnly?: boolean;
  buttonProps?: ButtonProps;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <>
      {iconOnly ? (
        <Tooltip title={label}>
          <IconButton size="small" color="error" onClick={() => setOpen(true)}><Trash /></IconButton>
        </Tooltip>
      ) : (
        <Button color="error" variant="outlined" startIcon={<Trash />} onClick={() => setOpen(true)} {...buttonProps}>
          {label}
        </Button>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">{description ?? 'Essa ação não pode ser desfeita.'}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await onConfirm();
                if (r.ok) {
                  toast(r.message ?? 'Excluído.');
                  setOpen(false);
                } else toast(r.error, 'error');
              })
            }
          >
            {label}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
