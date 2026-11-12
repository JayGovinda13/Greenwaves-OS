'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { EditPencil, Plus, Printer, Xmark } from 'iconoir-react';
import { saveShowProduction } from '@/app/(app)/shows/actions';
import { VENUE_RIDER_FIELDS, type Production } from '@/lib/production';
import { useToast } from '@/components/ui/Toast';

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Box sx={{ py: 2.5, borderTop: 1, borderColor: 'divider', '&:first-of-type': { borderTop: 0, pt: 0 } }}>
      <Typography variant="h5">{title}</Typography>
      {hint && <Typography variant="body2" color="text.secondary" mt={0.5}>{hint}</Typography>}
      <Box sx={{ mt: 2 }}>{children}</Box>
    </Box>
  );
}

function ProductionEditor({ value, onChange }: { value: Production; onChange: (p: Production) => void }) {
  const set = <K extends keyof Production>(k: K, v: Production[K]) => onChange({ ...value, [k]: v });
  return (
    <Box>
      <Section title="Horários-chave" hint="Aparecem em destaque no topo da página do show.">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
          <TextField label="Passagem de som" placeholder="18:30 – 20:00" value={value.soundcheck} onChange={(e) => set('soundcheck', e.target.value)} />
          <TextField label="Abertura da casa" placeholder="21:00" value={value.doors} onChange={(e) => set('doors', e.target.value)} />
          <TextField label="Show" placeholder="23:00" value={value.showtime} onChange={(e) => set('showtime', e.target.value)} />
          <TextField label="Cortesias" placeholder="10" value={value.courtesies} onChange={(e) => set('courtesies', e.target.value)} />
        </Box>
      </Section>

      <Section title="Evento">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <TextField label="Responsável na casa" placeholder="Nome · telefone" value={value.responsible} onChange={(e) => set('responsible', e.target.value)} />
          <TextField label="Contratante" placeholder="Nome · telefone" value={value.promoter} onChange={(e) => set('promoter', e.target.value)} />
        </Box>
        <Typography variant="body2" color="text.secondary" mt={1}>Local, endereço e técnico da casa vêm do cadastro do show.</Typography>
      </Section>

      <Section title="Equipe" hint="Produção e técnicos que viajam ou atendem a banda.">
        {value.team.map((m, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
            <TextField label="Função" value={m.role} onChange={(e) => set('team', value.team.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))} sx={{ flex: 1 }} />
            <TextField label="Nome" value={m.name} onChange={(e) => set('team', value.team.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} sx={{ flex: 1.2 }} />
            <TextField label="Telefone" value={m.phone} onChange={(e) => set('team', value.team.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x)))} sx={{ flex: 1 }} />
            <IconButton color="error" onClick={() => set('team', value.team.filter((_, j) => j !== i))} aria-label="Remover"><Xmark /></IconButton>
          </Box>
        ))}
        <Button size="small" startIcon={<Plus />} onClick={() => set('team', [...value.team, { role: '', name: '', phone: '' }])}>Pessoa</Button>
      </Section>

      <Section title="Cronograma da casa" hint="Inclua as outras bandas da noite. Marque os horários da banda para ficarem em destaque.">
        {value.rundown.map((r, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center', flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
            <TextField type="time" label="Início" value={r.start} onChange={(e) => set('rundown', value.rundown.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} sx={{ width: 120 }} fullWidth={false} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField type="time" label="Fim" value={r.end} onChange={(e) => set('rundown', value.rundown.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))} sx={{ width: 120 }} fullWidth={false} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="O que acontece" value={r.label} onChange={(e) => set('rundown', value.rundown.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} sx={{ flex: 1, minWidth: 180 }} />
            <FormControlLabel
              control={<Checkbox checked={r.ours} onChange={(e) => set('rundown', value.rundown.map((x, j) => (j === i ? { ...x, ours: e.target.checked } : x)))} />}
              label="Da banda"
            />
            <IconButton color="error" onClick={() => set('rundown', value.rundown.filter((_, j) => j !== i))} aria-label="Remover"><Xmark /></IconButton>
          </Box>
        ))}
        <Button size="small" startIcon={<Plus />} onClick={() => set('rundown', [...value.rundown, { start: '', end: '', label: '', ours: false }])}>Horário</Button>
      </Section>

      <Section title="Observações" hint="Consumação, camarim, translado, regras da casa…">
        <TextField multiline minRows={3} value={value.notes} onChange={(e) => set('notes', e.target.value)} />
      </Section>

      <Section title="Rider técnico da casa" hint="O que a casa oferece. Um item por linha.">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
          {VENUE_RIDER_FIELDS.map((f) => (
            <TextField
              key={f.key}
              label={f.label}
              multiline
              minRows={f.key === 'notes' ? 3 : 2}
              value={value.venueRider[f.key]}
              onChange={(e) => set('venueRider', { ...value.venueRider, [f.key]: e.target.value })}
              sx={f.key === 'notes' ? { gridColumn: { md: '1 / -1' } } : undefined}
            />
          ))}
        </Box>
      </Section>
    </Box>
  );
}

export interface NearbyShow { id: string; date: string; city: string | null; venue: string | null }

export function ProductionCard({ showId, saved, suggestion, nearby, canEdit }: {
  showId: string;
  saved: Production | null;
  suggestion: Production;
  nearby: NearbyShow[]; // shows do mesmo artista próximos (inclui este)
  canEdit: boolean;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<Production | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>(nearby.map((n) => n.id));
  const effective = saved ?? suggestion;
  const filledCount = [effective.soundcheck, effective.showtime, effective.responsible, effective.rundown.length ? 'x' : '', Object.values(effective.venueRider).some(Boolean) ? 'x' : ''].filter(Boolean).length;

  return (
    <Card sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h5">Ficha técnica</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>Documento da produção para a banda: roteiro, logística, cronograma e rider da casa.</Typography>
          <Box sx={{ mt: 1 }}>
            {saved ? <Chip size="small" color="success" variant="outlined" label={`Preenchida · ${filledCount}/5 seções`} />
              : <Chip size="small" color="warning" variant="outlined" label="Ainda não revisada · usando sugestão automática" />}
          </Box>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
        {canEdit && (
          <Button variant="outlined" startIcon={<EditPencil />} onClick={() => setEditing(structuredClone(effective))}>
            {saved ? 'Editar ficha' : 'Preencher ficha'}
          </Button>
        )}
        <Button component="a" href={`/imprimir/ficha-producao?shows=${showId}`} target="_blank" variant="contained" startIcon={<Printer />}>
          Exportar (este show)
        </Button>
        {nearby.length > 1 && (
          <Button variant="contained" color="secondary" startIcon={<Printer />} onClick={() => setTourOpen(true)}>
            Ficha de {nearby.length} shows
          </Button>
        )}
      </Box>

      {editing && (
        <Dialog open fullScreen onClose={() => setEditing(null)}>
          <DialogTitle>Ficha técnica do show</DialogTitle>
          <DialogContent dividers>
            {!saved && <Alert severity="info" sx={{ mb: 2 }}>Preenchemos o que já existe no sistema (roteiro do dia, contratante, equipe). Revise e complete.</Alert>}
            <ProductionEditor value={editing} onChange={setEditing} />
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setEditing(null)}>Cancelar</Button>
            <Button
              variant="contained"
              disabled={pending}
              onClick={() => start(async () => {
                const r = await saveShowProduction(showId, editing);
                toast(r.ok ? r.message! : r.error, r.ok ? 'success' : 'error');
                if (r.ok) { setEditing(null); router.refresh(); }
              })}
            >
              Salvar ficha
            </Button>
          </DialogActions>
        </Dialog>
      )}

      <Dialog open={tourOpen} onClose={() => setTourOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Ficha de vários shows</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" mb={1}>Um documento só, com capa, logística e uma página por show.</Typography>
          {nearby.map((n) => (
            <FormControlLabel
              key={n.id}
              sx={{ display: 'flex' }}
              control={<Checkbox checked={picked.includes(n.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, n.id] : picked.filter((x) => x !== n.id))} />}
              label={`${n.date.split('-').reverse().slice(0, 2).join('/')} · ${n.city ?? ''} · ${n.venue ?? ''}`}
            />
          ))}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setTourOpen(false)}>Cancelar</Button>
          <Tooltip title={picked.length ? '' : 'Escolha ao menos um show'}>
            <span>
              <Button component="a" href={`/imprimir/ficha-producao?shows=${picked.join(',')}`} target="_blank" variant="contained" disabled={!picked.length} onClick={() => setTourOpen(false)}>
                Exportar
              </Button>
            </span>
          </Tooltip>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
