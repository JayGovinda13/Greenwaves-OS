'use client';
import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { ptBR } from '@mui/x-data-grid/locales';
import { EditPencil, Instagram, Mail, Phone, Plus, Search } from 'iconoir-react';
import { deleteContact, saveContact } from '@/app/(app)/contatos/actions';
import { BR_STATES, CONTACT_KINDS, CONTACT_KIND_LABEL, REGION_BY_STATE, STATE_NAME, type ContactKind } from '@/lib/domain';
import { instagramUrl } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { F, FormSection } from '@/components/ui/FormSection';
import { useFormAction } from '@/components/ui/useFormAction';

export interface ContactRow {
  id: string; name: string; company: string | null; kind: string; region: string | null; state: string | null; city: string | null;
  phone: string | null; email: string | null; instagram: string | null; link: string | null; notes: string | null; shows: number;
}

const REGIONS = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];

function ContactDialog({ contact, onClose }: { contact?: ContactRow; onClose: () => void }) {
  const { submit, pending, err } = useFormAction((fd) => saveContact(contact?.id ?? null, fd), onClose);
  const s = (x: string | null | undefined) => x ?? '';
  const [state, setState] = useState(contact?.state ?? '');
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { component: 'form', onSubmit: submit } as object }}>
      <DialogTitle>{contact ? 'Editar contato' : 'Novo contratante'}</DialogTitle>
      <DialogContent dividers>
        <FormSection title="Quem">
          <F span={3}><TextField name="name" label="Contratante" required defaultValue={s(contact?.name)} {...err('name')} /></F>
          <F span={3}><TextField name="company" label="Casa / festival / coletivo" defaultValue={s(contact?.company)} /></F>
          <F span={3}>
            <TextField select name="kind" label="Tipo" defaultValue={contact?.kind ?? 'VENUE'}>
              {CONTACT_KINDS.map((k) => <MenuItem key={k} value={k}>{CONTACT_KIND_LABEL[k]}</MenuItem>)}
            </TextField>
          </F>
          <F span={3}>
            <TextField select name="state" label="Estado" value={state} onChange={(e) => setState(e.target.value)}>
              <MenuItem value="">—</MenuItem>
              {BR_STATES.map((u) => <MenuItem key={u} value={u}>{u} — {STATE_NAME[u]}</MenuItem>)}
            </TextField>
          </F>
          <F span={3}><TextField name="city" label="Cidade" defaultValue={s(contact?.city)} /></F>
          <F span={3}>
            <TextField
              label="Região"
              value={state ? REGION_BY_STATE[state] ?? '' : ''}
              placeholder="Definida pelo estado"
              disabled
              helperText="Preenchida automaticamente pelo estado"
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </F>
        </FormSection>
        <FormSection title="Contato">
          <F span={3}><TextField name="phone" label="Telefone" defaultValue={s(contact?.phone)} /></F>
          <F span={3}><TextField name="email" label="E-mail" defaultValue={s(contact?.email)} /></F>
          <F span={3}><TextField name="instagram" label="Instagram" defaultValue={s(contact?.instagram)} /></F>
          <F span={3}><TextField name="link" label="Link" defaultValue={s(contact?.link)} /></F>
          <F span={6}><TextField name="notes" label="Observações" multiline minRows={2} defaultValue={s(contact?.notes)} /></F>
        </FormSection>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="contained" disabled={pending}>Salvar</Button>
      </DialogActions>
    </Dialog>
  );
}

export function ContactsView({ rows, canEdit, canDelete, initialQuery }: { rows: ContactRow[]; canEdit: boolean; canDelete: boolean; initialQuery: string }) {
  const [q, setQ] = useState(initialQuery);
  const [region, setRegion] = useState('');
  const [kind, setKind] = useState('');
  const [editing, setEditing] = useState<ContactRow | 'new' | null>(null);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!region || r.region === region) &&
        (!kind || r.kind === kind) &&
        (!t || [r.name, r.company, r.city, r.state, r.instagram, r.email, r.notes].some((x) => x?.toLowerCase().includes(t))),
    );
  }, [rows, q, region, kind]);

  const byRegion = REGIONS.map((r) => ({ r, n: rows.filter((x) => x.region === r).length }));

  const columns: GridColDef<ContactRow>[] = [
    {
      field: 'name', headerName: 'Contratante', flex: 1.2, minWidth: 190,
      renderCell: ({ row }) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography fontWeight={700} fontSize={14} noWrap>{row.name}</Typography>
          <Typography fontSize={12} color="text.secondary" noWrap>{row.company ?? '—'}</Typography>
        </Box>
      ),
    },
    { field: 'kind', headerName: 'Tipo', width: 130, valueGetter: (_, r) => CONTACT_KIND_LABEL[r.kind as ContactKind] ?? r.kind, renderCell: ({ value }) => <Chip size="small" variant="outlined" label={value} /> },
    { field: 'city', headerName: 'Cidade', flex: 1, minWidth: 140, valueGetter: (_, r) => [r.city, r.state].filter(Boolean).join(' · ') },
    { field: 'region', headerName: 'Região', width: 120 },
    {
      field: 'contact', headerName: 'Contato', width: 150, sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {row.phone && <Tooltip title={row.phone}><IconButton size="small" component="a" href={`https://wa.me/55${row.phone.replace(/\D/g, '').replace(/^0/, '')}`} target="_blank"><Phone /></IconButton></Tooltip>}
          {row.email && <Tooltip title={row.email}><IconButton size="small" component="a" href={`mailto:${row.email.split(/[\s/]+/)[0]}`}><Mail /></IconButton></Tooltip>}
          {row.instagram && <Tooltip title={row.instagram}><IconButton size="small" component="a" href={instagramUrl(row.instagram)!} target="_blank"><Instagram /></IconButton></Tooltip>}
        </Box>
      ),
    },
    { field: 'shows', headerName: 'Shows', width: 90, type: 'number' },
    {
      field: 'actions', headerName: '', width: 100, sortable: false, align: 'right',
      renderCell: ({ row }) => (
        <Box>
          {canEdit && <IconButton size="small" onClick={() => setEditing(row)} aria-label="Editar"><EditPencil /></IconButton>}
          {canDelete && <ConfirmButton iconOnly title={`Excluir ${row.name}?`} onConfirm={() => deleteContact(row.id)} />}
        </Box>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        overline="CRM de booking"
        title="Contratantes"
        subtitle="Casas de show, festivais, coletivos e produtores de todo o Brasil."
        actions={canEdit ? <Button variant="contained" startIcon={<Plus />} onClick={() => setEditing('new')}>Novo contato</Button> : undefined}
      />
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <Chip label={`Todas (${rows.length})`} color={region === '' ? 'primary' : 'default'} onClick={() => setRegion('')} />
        {byRegion.map(({ r, n }) => (
          <Chip key={r} label={`${r} (${n})`} color={region === r ? 'primary' : 'default'} onClick={() => setRegion(region === r ? '' : r)} />
        ))}
      </Box>
      <Card sx={{ p: 2, mb: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Buscar por nome, casa, cidade, Instagram…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{ flex: '3 1 260px' }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }}
        />
        <TextField select label="Tipo" value={kind} onChange={(e) => setKind(e.target.value)} sx={{ flex: '1 1 160px' }}>
          <MenuItem value="">Todos</MenuItem>
          {CONTACT_KINDS.map((k) => <MenuItem key={k} value={k}>{CONTACT_KIND_LABEL[k]}</MenuItem>)}
        </TextField>
      </Card>
      <Card>
        <DataGrid
          rows={filtered}
          columns={columns}
          localeText={ptBR.components.MuiDataGrid.defaultProps.localeText}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          pageSizeOptions={[25, 50, 100]}
          rowHeight={58}
          disableRowSelectionOnClick
          autoHeight
        />
      </Card>
      {editing && <ContactDialog contact={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </>
  );
}
