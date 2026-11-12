'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { EditPencil, Printer, Undo } from 'iconoir-react';
import { saveShowTechInfo, saveShowTechRider } from '@/app/(app)/shows/actions';
import type { TechRider } from '@/lib/techRider';
import { useFormAction } from '@/components/ui/useFormAction';
import { useToast } from '@/components/ui/Toast';
import { TechRiderEditor } from './TechRiderEditor';
import { StagePlot } from './StagePlot';

export function ShowTechRiderCard({ showId, artistId, artistRider, showRider, venueTechContact, techNotes, canEdit }: {
  showId: string;
  artistId: string;
  artistRider: TechRider | null;
  showRider: TechRider | null;
  venueTechContact: string | null;
  techNotes: string | null;
  canEdit: boolean;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<TechRider | null>(null);
  const info = useFormAction((fd) => saveShowTechInfo(showId, fd));
  const effective = showRider ?? artistRider;

  const persist = (data: TechRider | null) =>
    start(async () => {
      const r = await saveShowTechRider(showId, data);
      toast(r.ok ? r.message! : r.error, r.ok ? 'success' : 'error');
      if (r.ok) { setEditing(null); router.refresh(); }
    });

  return (
    <Card sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h5">Ficha técnica</Typography>
          <Box sx={{ mt: 0.75 }}>
            {showRider ? <Chip size="small" color="secondary" label="Personalizada para este show" />
              : artistRider ? <Chip size="small" variant="outlined" label="Usando o modelo do artista" />
              : <Chip size="small" color="warning" variant="outlined" label="Artista sem ficha técnica" />}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {effective && (
            <Button component="a" href={`/imprimir/ficha-tecnica/${showId}`} target="_blank" variant="contained" startIcon={<Printer />}>
              Exportar ficha técnica
            </Button>
          )}
        </Box>
      </Box>

      {!effective ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          Monte o modelo uma vez no cadastro do artista e ele passa a valer para todos os shows.{' '}
          <Link href={`/artistas/${artistId}?aba=ficha`} style={{ fontWeight: 700, color: 'inherit' }}>Criar ficha técnica →</Link>
        </Alert>
      ) : (
        <>
          <Box sx={{ mt: 2, maxWidth: 520 }}>
            <StagePlot items={effective.stage.items} />
          </Box>
          <Typography variant="body2" color="text.secondary" mt={1}>
            {effective.inputs.length} canais · {effective.monitors.length} vias de monitor · {effective.backline.filter((b) => b.provider === 'VENUE').length} itens de backline da casa
          </Typography>
          {canEdit && (
            <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
              <Button size="small" startIcon={<EditPencil />} onClick={() => setEditing(structuredClone(effective))}>
                {showRider ? 'Editar personalização' : 'Personalizar para este show'}
              </Button>
              {showRider && artistRider && (
                <Button size="small" color="inherit" startIcon={<Undo />} disabled={pending} onClick={() => persist(null)}>Voltar ao modelo do artista</Button>
              )}
            </Box>
          )}
        </>
      )}

      <Box component="form" onSubmit={info.submit} sx={{ mt: 2.5, pt: 2, borderTop: 1, borderColor: 'divider', display: 'grid', gap: 1.5 }}>
        <Typography variant="overline" color="text.secondary">Deste show</Typography>
        <TextField name="venueTechContact" label="Técnico / contato técnico da casa" placeholder="Nome · telefone" defaultValue={venueTechContact ?? ''} disabled={!canEdit} />
        <TextField name="techNotes" label="Observações técnicas deste show" multiline minRows={2} defaultValue={techNotes ?? ''} disabled={!canEdit} placeholder="Ex.: a casa tem mesa analógica de 16 canais; banda divide backline com a abertura." />
        {canEdit && <Button type="submit" variant="outlined" size="small" disabled={info.pending} sx={{ justifySelf: 'start' }}>Salvar</Button>}
      </Box>

      {editing && (
        <Dialog open fullScreen onClose={() => setEditing(null)}>
          <DialogTitle>Ficha técnica deste show</DialogTitle>
          <DialogContent dividers>
            <Alert severity="info" sx={{ mb: 2 }}>As mudanças valem só para este show. O modelo do artista não é alterado.</Alert>
            <TechRiderEditor value={editing} onChange={setEditing} />
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setEditing(null)}>Cancelar</Button>
            <Button variant="contained" disabled={pending} onClick={() => persist(editing)}>Salvar ficha do show</Button>
          </DialogActions>
        </Dialog>
      )}
    </Card>
  );
}
