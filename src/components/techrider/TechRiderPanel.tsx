'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { Page, Printer, FloppyDisk } from 'iconoir-react';
import { saveArtistTechRider } from '@/app/(app)/artistas/actions';
import { emptyRider, starterRider, type TechRider } from '@/lib/techRider';
import { useToast } from '@/components/ui/Toast';
import { TechRiderEditor } from './TechRiderEditor';
import { StagePlot } from './StagePlot';

/** Aba "Ficha técnica" do artista: modelo editável + exportação. */
export function TechRiderPanel({ artistId, initial, members, canEdit }: {
  artistId: string;
  initial: TechRider | null;
  members: { name: string; role: string | null }[];
  canEdit: boolean;
}) {
  const [rider, setRider] = useState<TechRider | null>(initial);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const change = (v: TechRider) => { setRider(v); setDirty(true); };
  const save = () =>
    start(async () => {
      const r = await saveArtistTechRider(artistId, rider);
      toast(r.ok ? r.message! : r.error, r.ok ? 'success' : 'error');
      if (r.ok) { setDirty(false); router.refresh(); }
    });

  if (!rider) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h5">Monte o rider da banda</Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 520, mx: 'auto', mt: 1 }}>
          Crie o modelo uma vez: formação, lista de canais, retornos, backline, mapa de palco e necessidades técnicas.
          Cada show usa esse modelo e completa com casa, data e horários na hora de exportar.
        </Typography>
        {canEdit ? (
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mt: 3, flexWrap: 'wrap' }}>
            <Button variant="contained" startIcon={<Page />} onClick={() => change(starterRider(members))}>Começar do modelo de banda</Button>
            <Button variant="outlined" onClick={() => change(emptyRider())}>Começar em branco</Button>
          </Box>
        ) : (
          <Typography color="text.secondary" mt={2}>Ainda não há ficha técnica para este artista.</Typography>
        )}
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          position: 'sticky', top: 64, zIndex: 5, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap',
          px: 3, py: 1.5, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider',
        }}
      >
        <Typography color={dirty ? 'warning.main' : 'text.secondary'} fontWeight={dirty ? 700 : 400} sx={{ flex: 1 }}>
          {dirty ? 'Alterações não salvas' : 'Rider técnico e mapa de palco deste artista'}
        </Typography>
        <Button component="a" href={`/imprimir/ficha-tecnica/artista/${artistId}`} target="_blank" variant="outlined" startIcon={<Printer />} disabled={dirty}>
          Exportar rider
        </Button>
        {canEdit && (
          <Button variant="contained" startIcon={<FloppyDisk />} onClick={save} disabled={!dirty || pending}>
            {pending ? 'Salvando…' : 'Salvar'}
          </Button>
        )}
      </Box>
      <Box sx={{ p: 3 }}>
        {canEdit ? <TechRiderEditor value={rider} onChange={change} /> : <StagePlot items={rider.stage.items} />}
      </Box>
    </Box>
  );
}
