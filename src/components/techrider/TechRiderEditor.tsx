'use client';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { NavArrowDown, NavArrowUp, Plus, Xmark } from 'iconoir-react';
import {
  BACKLINE_PROVIDERS, BACKLINE_PROVIDER_LABEL, MONITOR_TYPES, MONITOR_TYPE_LABEL, type TechRider,
} from '@/lib/techRider';
import { StagePlot } from './StagePlot';

interface Col<R> {
  key: keyof R & string;
  label: string;
  flex: number;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

/** Tabela editável: adicionar, remover e reordenar linhas. */
function EditableTable<R extends Record<string, string>>({ rows, cols, onChange, blank, numbered, addLabel }: {
  rows: R[];
  cols: Col<R>[];
  onChange: (rows: R[]) => void;
  blank: () => R;
  numbered?: string;
  addLabel: string;
}) {
  const set = (i: number, k: keyof R, v: string) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  };
  return (
    <Box>
      <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, px: 0.5, mb: 0.5 }}>
        {numbered && <Typography variant="overline" color="text.secondary" sx={{ width: 36 }}>{numbered}</Typography>}
        {cols.map((c) => <Typography key={c.key} variant="overline" color="text.secondary" sx={{ flex: c.flex }}>{c.label}</Typography>)}
        <Box sx={{ width: 104 }} />
      </Box>
      {rows.map((r, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.75, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
          {numbered && <Typography fontWeight={900} sx={{ width: 36, textAlign: 'center', fontFamily: 'var(--font-display)', fontStretch: '125%' }}>{i + 1}</Typography>}
          {cols.map((c) => (
            <TextField
              key={c.key}
              select={!!c.options}
              value={r[c.key] ?? ''}
              onChange={(e) => set(i, c.key, e.target.value)}
              placeholder={c.placeholder ?? c.label}
              sx={{ flex: { xs: '1 1 45%', md: c.flex } }}
              slotProps={{ htmlInput: { 'aria-label': c.label } }}
            >
              {c.options?.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
          ))}
          <Box sx={{ display: 'flex', width: 104, flexShrink: 0 }}>
            <IconButton size="small" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir"><NavArrowUp /></IconButton>
            <IconButton size="small" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Descer"><NavArrowDown /></IconButton>
            <Tooltip title="Remover linha">
              <IconButton size="small" color="error" onClick={() => onChange(rows.filter((_, j) => j !== i))}><Xmark /></IconButton>
            </Tooltip>
          </Box>
        </Box>
      ))}
      <Button size="small" startIcon={<Plus />} onClick={() => onChange([...rows, blank()])}>{addLabel}</Button>
    </Box>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Box sx={{ py: 2.5, borderTop: 1, borderColor: 'divider', '&:first-of-type': { borderTop: 0, pt: 0 } }}>
      <Typography variant="h5">{title}</Typography>
      {hint && <Typography variant="body2" color="text.secondary" mt={0.5}>{hint}</Typography>}
      <Box sx={{ mt: 2 }}>{children}</Box>
    </Box>
  );
}

export function TechRiderEditor({ value, onChange }: { value: TechRider; onChange: (v: TechRider) => void }) {
  const set = <K extends keyof TechRider>(k: K, v: TechRider[K]) => onChange({ ...value, [k]: v });
  return (
    <Box>
      <Section title="Mapa de palco" hint="Monte a disposição da banda no palco. A frente (plateia) fica embaixo.">
        <StagePlot items={value.stage.items} onChange={(items) => set('stage', { ...value.stage, items })} />
        <Box sx={{ display: 'flex', gap: 2, mt: 2, maxWidth: 420 }}>
          <TextField label="Palco mínimo: largura (m)" value={value.stage.minWidth} onChange={(e) => set('stage', { ...value.stage, minWidth: e.target.value })} />
          <TextField label="Profundidade (m)" value={value.stage.minDepth} onChange={(e) => set('stage', { ...value.stage, minDepth: e.target.value })} />
        </Box>
      </Section>

      <Section title="Formação" hint="Quem toca o quê no palco.">
        <EditableTable
          rows={value.lineup}
          onChange={(rows) => set('lineup', rows)}
          blank={() => ({ name: '', role: '' })}
          addLabel="Integrante"
          cols={[
            { key: 'role', label: 'Função / instrumento', flex: 1 },
            { key: 'name', label: 'Nome', flex: 1 },
          ]}
        />
      </Section>

      <Section title="Lista de canais (input list)" hint="A ordem define o número do canal na mesa.">
        <EditableTable
          rows={value.inputs}
          onChange={(rows) => set('inputs', rows)}
          blank={() => ({ source: '', mic: '', stand: '', notes: '' })}
          numbered="Canal"
          addLabel="Canal"
          cols={[
            { key: 'source', label: 'Fonte', flex: 1.3, placeholder: 'Ex.: Caixa' },
            { key: 'mic', label: 'Microfone / DI', flex: 1.2, placeholder: 'Ex.: SM57' },
            { key: 'stand', label: 'Pedestal', flex: 0.8 },
            { key: 'notes', label: 'Obs.', flex: 1.2 },
          ]}
        />
      </Section>

      <Section title="Retornos (monitor)">
        <EditableTable
          rows={value.monitors}
          onChange={(rows) => set('monitors', rows as TechRider['monitors'])}
          blank={() => ({ who: '', type: 'WEDGE', notes: '' })}
          numbered="Via"
          addLabel="Via de monitor"
          cols={[
            { key: 'who', label: 'Para quem', flex: 1.3 },
            { key: 'type', label: 'Tipo', flex: 0.9, options: MONITOR_TYPES.map((t) => ({ value: t, label: MONITOR_TYPE_LABEL[t] })) },
            { key: 'notes', label: 'Obs. (o que quer ouvir)', flex: 1.5 },
          ]}
        />
      </Section>

      <Section title="Backline" hint="O que a banda leva e o que a casa precisa fornecer.">
        <EditableTable
          rows={value.backline}
          onChange={(rows) => set('backline', rows as TechRider['backline'])}
          blank={() => ({ item: '', qty: '1', provider: 'VENUE', notes: '' })}
          addLabel="Item"
          cols={[
            { key: 'item', label: 'Equipamento', flex: 2 },
            { key: 'qty', label: 'Qtd.', flex: 0.4 },
            { key: 'provider', label: 'Responsável', flex: 0.9, options: BACKLINE_PROVIDERS.map((p) => ({ value: p, label: BACKLINE_PROVIDER_LABEL[p] })) },
            { key: 'notes', label: 'Obs.', flex: 1.4 },
          ]}
        />
      </Section>

      <Section title="Som, luz e energia">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
          <TextField label="PA e mesa" multiline minRows={3} value={value.pa} onChange={(e) => set('pa', e.target.value)} />
          <TextField label="Luz" multiline minRows={3} value={value.lights} onChange={(e) => set('lights', e.target.value)} />
          <TextField label="Energia" multiline minRows={3} value={value.power} onChange={(e) => set('power', e.target.value)} />
        </Box>
      </Section>

      <Section title="Tempos e contato técnico">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(6, 1fr)' }, gap: 2 }}>
          <TextField label="Duração do show (min)" value={value.setMinutes} onChange={(e) => set('setMinutes', e.target.value)} />
          <TextField label="Passagem de som (min)" value={value.soundcheckMinutes} onChange={(e) => set('soundcheckMinutes', e.target.value)} />
          <TextField label="Troca de palco (min)" value={value.changeoverMinutes} onChange={(e) => set('changeoverMinutes', e.target.value)} />
          <TextField label="Técnico da banda" value={value.techContact.name} onChange={(e) => set('techContact', { ...value.techContact, name: e.target.value })} />
          <TextField label="Telefone" value={value.techContact.phone} onChange={(e) => set('techContact', { ...value.techContact, phone: e.target.value })} />
          <TextField label="E-mail" value={value.techContact.email} onChange={(e) => set('techContact', { ...value.techContact, email: e.target.value })} />
        </Box>
      </Section>

      <Section title="Observações gerais">
        <TextField multiline minRows={3} value={value.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Ex.: a banda leva técnico de som próprio; precisa de 2 toalhas e água no palco." />
      </Section>
    </Box>
  );
}
