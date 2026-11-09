'use client';
import { useState } from 'react';
import Button, { type ButtonProps } from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Map as MapIcon } from 'iconoir-react';
import { dayjs } from '@/lib/format';

/** Abre o roadmap (itinerário da turnê) de um artista num período, em nova aba para imprimir/salvar PDF. */
export function RoadmapButton({ artists, artistId, buttonProps, label = 'Roadmap da turnê' }: {
  artists?: { id: string; name: string }[];
  artistId?: string;
  buttonProps?: ButtonProps;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [artist, setArtist] = useState(artistId ?? artists?.[0]?.id ?? '');
  const [from, setFrom] = useState(dayjs().format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().add(30, 'day').format('YYYY-MM-DD'));
  const href = `/imprimir/roadmap?artist=${artist}&from=${from}&to=${to}`;
  return (
    <>
      <Button variant="outlined" startIcon={<MapIcon />} onClick={() => setOpen(true)} {...buttonProps}>{label}</Button>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Roadmap da turnê</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Itinerário com mapa e rota, trechos, horários de embarque, check-in, show e situação da produção de cada data.
            </Typography>
            {!artistId && artists && (
              <TextField select label="Artista" value={artist} onChange={(e) => setArtist(e.target.value)}>
                {artists.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
              </TextField>
            )}
            <TextField type="date" label="De" value={from} onChange={(e) => setFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField type="date" label="Até" value={to} onChange={(e) => setTo(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button component="a" href={href} target="_blank" variant="contained" disabled={!artist || to < from} onClick={() => setOpen(false)}>
            Gerar roadmap
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
