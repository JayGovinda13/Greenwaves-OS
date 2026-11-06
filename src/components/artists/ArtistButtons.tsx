'use client';
import { useState } from 'react';
import Button from '@mui/material/Button';
import { EditPencil, Plus } from 'iconoir-react';
import { ArtistFormDialog, type ArtistFormValues } from './ArtistFormDialog';

export function NewArtistButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="contained" startIcon={<Plus />} onClick={() => setOpen(true)}>Novo artista</Button>
      {open && <ArtistFormDialog open onClose={() => setOpen(false)} />}
    </>
  );
}

export function EditArtistButton({ artist, sx }: { artist: ArtistFormValues; sx?: object }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="contained" color="secondary" startIcon={<EditPencil />} onClick={() => setOpen(true)} sx={sx}>Editar</Button>
      {open && <ArtistFormDialog open onClose={() => setOpen(false)} initial={artist} />}
    </>
  );
}
