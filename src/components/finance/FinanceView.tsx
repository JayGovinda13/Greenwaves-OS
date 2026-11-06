'use client';
import { useMemo, useState, useTransition } from 'react';
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
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { ptBR } from '@mui/x-data-grid/locales';
import { Check, EditPencil, Plus, Search, Xmark } from 'iconoir-react';
import { deleteTransaction, markPaid, saveTransaction } from '@/app/(app)/financeiro/actions';
import { TX_CATEGORIES, TX_CATEGORY_LABEL, TX_METHODS, TX_METHOD_LABEL, TX_STATUS, TX_STATUS_LABEL, type TxCategory } from '@/lib/domain';
import { fmtDate, money, moneyToInput, toInputDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { TxStatusChip } from '@/components/ui/StatusChip';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { F, FormSection } from '@/components/ui/FormSection';
import { useFormAction } from '@/components/ui/useFormAction';
import { useToast } from '@/components/ui/Toast';

export interface TxRow {
  id: string; type: string; category: string; description: string; amount: number; date: string; dueDate: string | null;
  status: string; method: string | null; showId: string | null; artistId: string | null; notes: string | null;
  artist: string | null; showLabel: string | null;
}
type Opt = { id: string; name: string };
type ShowOpt = { id: string; artistId: string; label: string };

function TxDialog({ tx, onClose, artists, shows }: { tx?: TxRow; onClose: () => void; artists: Opt[]; shows: ShowOpt[] }) {
  const { submit, pending, err } = useFormAction((fd) => saveTransaction(tx?.id ?? null, fd), onClose);
  const [type, setType] = useState(tx?.type ?? 'INCOME');
  const [artistId, setArtistId] = useState(tx?.artistId ?? '');
  const [showId, setShowId] = useState(tx?.showId ?? '');
  const showOpts = artistId ? shows.filter((s) => s.artistId === artistId) : shows;
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { component: 'form', onSubmit: submit } as object }}>
      <DialogTitle>{tx ? 'Editar lançamento' : 'Novo lançamento'}</DialogTitle>
      <DialogContent dividers>
        <ToggleButtonGroup exclusive fullWidth value={type} onChange={(_, v) => v && setType(v)} sx={{ mb: 1 }}>
          <ToggleButton value="INCOME">Receita</ToggleButton>
          <ToggleButton value="EXPENSE">Despesa</ToggleButton>
        </ToggleButtonGroup>
        <input type="hidden" name="type" value={type} />
        <FormSection title="Lançamento">
          <F span={6}><TextField name="description" label="Descrição" required defaultValue={tx?.description ?? ''} {...err('description')} /></F>
          <F span={3}>
            <TextField name="amount" label="Valor" required defaultValue={moneyToInput(tx?.amount)} {...err('amount')}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">R$</InputAdornment> } }} />
          </F>
          <F span={3}>
            <TextField select name="category" label="Categoria" defaultValue={tx?.category ?? (type === 'INCOME' ? 'FEE' : 'TRAVEL')}>
              {TX_CATEGORIES.map((c) => <MenuItem key={c} value={c}>{TX_CATEGORY_LABEL[c]}</MenuItem>)}
            </TextField>
          </F>
          <F span={2}><TextField type="date" name="date" label="Competência" required defaultValue={toInputDate(tx?.date ?? new Date())} slotProps={{ inputLabel: { shrink: true } }} /></F>
          <F span={2}><TextField type="date" name="dueDate" label="Vencimento" defaultValue={toInputDate(tx?.dueDate)} slotProps={{ inputLabel: { shrink: true } }} /></F>
          <F span={2}>
            <TextField select name="status" label="Status" defaultValue={tx?.status ?? 'PENDING'}>
              {TX_STATUS.map((s) => <MenuItem key={s} value={s}>{TX_STATUS_LABEL[s]}</MenuItem>)}
            </TextField>
          </F>
          <F span={2}>
            <TextField select name="method" label="Forma" defaultValue={tx?.method ?? ''}>
              <MenuItem value="">—</MenuItem>
              {TX_METHODS.map((m) => <MenuItem key={m} value={m}>{TX_METHOD_LABEL[m]}</MenuItem>)}
            </TextField>
          </F>
          <F span={2}>
            <TextField select name="artistId" label="Artista" value={artistId} onChange={(e) => { setArtistId(e.target.value); setShowId(''); }}>
              <MenuItem value="">—</MenuItem>
              {artists.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
            </TextField>
          </F>
          <F span={2}>
            <TextField select name="showId" label="Show" value={showId} onChange={(e) => setShowId(e.target.value)}>
              <MenuItem value="">—</MenuItem>
              {showOpts.map((s) => <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>)}
            </TextField>
          </F>
          <F span={6}><TextField name="notes" label="Observações" multiline minRows={2} defaultValue={tx?.notes ?? ''} /></F>
        </FormSection>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="contained" disabled={pending}>Salvar</Button>
      </DialogActions>
    </Dialog>
  );
}

export function FinanceView({ rows, artists, shows, canEdit, header, showFilter }: {
  rows: TxRow[]; artists: Opt[]; shows: ShowOpt[]; canEdit: boolean; header: React.ReactNode; showFilter: string | null;
}) {
  const [q, setQ] = useState('');
  const [type, setType] = useState<'all' | 'INCOME' | 'EXPENSE'>('all');
  const [status, setStatus] = useState('');
  const [onlyShow, setOnlyShow] = useState(showFilter);
  const [editing, setEditing] = useState<TxRow | 'new' | null>(null);
  const [, start] = useTransition();
  const toast = useToast();

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (type === 'all' || r.type === type) &&
        (!status || r.status === status) &&
        (!onlyShow || r.showId === onlyShow) &&
        (!t || [r.description, r.artist, r.showLabel].some((x) => x?.toLowerCase().includes(t))),
    );
  }, [rows, q, type, status, onlyShow]);
  const total = filtered.filter((r) => r.status !== 'CANCELED').reduce((s, r) => s + (r.type === 'INCOME' ? r.amount : -r.amount), 0);

  const columns: GridColDef<TxRow>[] = [
    { field: 'date', headerName: 'Data', width: 105, valueFormatter: (v: string) => fmtDate(v) },
    {
      field: 'description', headerName: 'Descrição', flex: 1.6, minWidth: 220,
      renderCell: ({ row }) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography fontWeight={700} fontSize={14} noWrap>{row.description}</Typography>
          <Typography fontSize={12} color="text.secondary" noWrap>{[TX_CATEGORY_LABEL[row.category as TxCategory], row.artist, row.showLabel].filter(Boolean).join(' · ')}</Typography>
        </Box>
      ),
    },
    { field: 'dueDate', headerName: 'Vencimento', width: 110, valueFormatter: (v: string | null) => fmtDate(v) },
    { field: 'status', headerName: 'Status', width: 115, renderCell: ({ row }) => <TxStatusChip status={row.status} /> },
    {
      field: 'amount', headerName: 'Valor', width: 140, type: 'number',
      valueGetter: (_, r) => (r.type === 'INCOME' ? r.amount : -r.amount),
      renderCell: ({ row }) => (
        <Typography fontWeight={800} fontSize={14} color={row.type === 'INCOME' ? 'success.main' : 'error.main'} sx={{ width: '100%', textAlign: 'right' }}>
          {row.type === 'INCOME' ? '+' : '−'} {money(row.amount, true)}
        </Typography>
      ),
    },
    {
      field: 'actions', headerName: '', width: 130, sortable: false, align: 'right',
      renderCell: ({ row }) =>
        canEdit ? (
          <Box>
            {row.status === 'PENDING' && (
              <Tooltip title="Marcar como pago">
                <IconButton size="small" color="success" onClick={() => start(async () => { const r = await markPaid(row.id); toast(r.ok ? r.message! : r.error, r.ok ? 'success' : 'error'); })}>
                  <Check />
                </IconButton>
              </Tooltip>
            )}
            <IconButton size="small" onClick={() => setEditing(row)} aria-label="Editar"><EditPencil /></IconButton>
            <ConfirmButton iconOnly title="Excluir lançamento?" onConfirm={() => deleteTransaction(row.id)} />
          </Box>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        overline="Cachês, despesas e acertos"
        title="Financeiro"
        actions={canEdit ? <Button variant="contained" startIcon={<Plus />} onClick={() => setEditing('new')}>Novo lançamento</Button> : undefined}
      />
      {header}
      <Card sx={{ p: 2, mb: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          placeholder="Buscar lançamento, artista…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{ flex: '3 1 240px' }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }}
        />
        <ToggleButtonGroup size="small" exclusive value={type} onChange={(_, v) => v && setType(v)}>
          <ToggleButton value="all">Tudo</ToggleButton>
          <ToggleButton value="INCOME">Receitas</ToggleButton>
          <ToggleButton value="EXPENSE">Despesas</ToggleButton>
        </ToggleButtonGroup>
        <TextField select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ flex: '1 1 140px' }}>
          <MenuItem value="">Todos</MenuItem>
          {TX_STATUS.map((s) => <MenuItem key={s} value={s}>{TX_STATUS_LABEL[s]}</MenuItem>)}
        </TextField>
        {onlyShow && <Chip label="Filtrado por show" onDelete={() => setOnlyShow(null)} deleteIcon={<Xmark />} color="primary" />}
        <Typography sx={{ ml: 'auto', fontWeight: 800 }}>Saldo filtrado: {money(total, true)}</Typography>
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
      {editing && <TxDialog tx={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} artists={artists} shows={shows} />}
    </>
  );
}
