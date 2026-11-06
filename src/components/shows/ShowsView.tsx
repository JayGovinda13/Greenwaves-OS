'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { ptBR } from '@mui/x-data-grid/locales';
import { Calendar, List, Plus, Search } from 'iconoir-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { ShowStatusChip } from '@/components/ui/StatusChip';
import { SHOW_STATUS, SHOW_STATUS_LABEL } from '@/lib/domain';
import { dayjs } from '@/lib/format';
import { artistColor } from '@/lib/colors';
import { ShowFormDialog } from './ShowFormDialog';
import { ShowsCalendar } from './ShowsCalendar';
import { dealLabel } from './dealLabel';

export interface ShowRow {
  id: string;
  date: string;
  artistId: string;
  artist: string;
  artistSlug: string;
  city: string | null;
  state: string | null;
  venue: string | null;
  status: string;
  dealType: string;
  fee: number | null;
  doorPercent: number | null;
  dealNotes: string | null;
  ticketsSold: number | null;
  progress: { done: number; total: number };
}

type Period = 'upcoming' | 'past' | 'all';

export function ShowsView({ rows, artists, contacts, canEdit }: {
  rows: ShowRow[];
  artists: { id: string; name: string }[];
  contacts: { id: string; name: string; company: string | null; city: string | null }[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [q, setQ] = useState('');
  const [artist, setArtist] = useState('');
  const [status, setStatus] = useState('');
  const [period, setPeriod] = useState<Period>('upcoming');
  const [open, setOpen] = useState(false);

  const today = dayjs().format('YYYY-MM-DD');
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      const day = r.date.slice(0, 10);
      if (view === 'list' && period === 'upcoming' && day < today) return false;
      if (view === 'list' && period === 'past' && day >= today) return false;
      if (artist && r.artistId !== artist) return false;
      if (status && r.status !== status) return false;
      if (term && ![r.artist, r.city, r.venue, r.state].some((x) => x?.toLowerCase().includes(term))) return false;
      return true;
    });
  }, [rows, q, artist, status, period, today, view]);

  const columns: GridColDef<ShowRow>[] = [
    {
      field: 'date', headerName: 'Data', width: 120,
      valueGetter: (_, r) => r.date,
      renderCell: ({ row }) => (
        <Box>
          <Typography fontWeight={800} fontSize={14} lineHeight={1.2}>{dayjs.utc(row.date).format('DD MMM')}</Typography>
          <Typography fontSize={12} color="text.secondary" lineHeight={1.2} textTransform="capitalize">{dayjs.utc(row.date).format('ddd · YYYY')}</Typography>
        </Box>
      ),
    },
    {
      field: 'artist', headerName: 'Artista', flex: 1, minWidth: 170,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: artistColor(row.artistSlug), flexShrink: 0 }} />
          <Typography fontWeight={700} fontSize={14} noWrap>{row.artist}</Typography>
        </Box>
      ),
    },
    {
      field: 'city', headerName: 'Cidade', flex: 1, minWidth: 150,
      valueGetter: (_, r) => [r.city, r.state].filter(Boolean).join(' · '),
    },
    { field: 'venue', headerName: 'Local', flex: 1.2, minWidth: 170 },
    { field: 'status', headerName: 'Status', width: 130, renderCell: ({ row }) => <ShowStatusChip status={row.status} /> },
    { field: 'deal', headerName: 'Combinado', width: 170, valueGetter: (_, r) => dealLabel(r), sortComparator: (a, b) => String(a).localeCompare(String(b)) },
    { field: 'ticketsSold', headerName: 'Ingressos', width: 100, type: 'number' },
    {
      field: 'progress', headerName: 'Produção', width: 130,
      valueGetter: (_, r) => r.progress.done / r.progress.total,
      renderCell: ({ row }) => (
        <Box sx={{ width: '100%' }}>
          <LinearProgress variant="determinate" value={(row.progress.done / row.progress.total) * 100} color={row.progress.done === row.progress.total ? 'success' : 'primary'} sx={{ height: 6, borderRadius: 3 }} />
          <Typography fontSize={11} color="text.secondary" mt={0.25}>{row.progress.done}/{row.progress.total} itens</Typography>
        </Box>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        overline="Booking & produção"
        title="Agenda de shows"
        subtitle={`${rows.length} datas cadastradas · ${rows.filter((r) => r.date.slice(0, 10) >= today && r.status !== 'CANCELED').length} por vir`}
        actions={
          <>
            <ToggleButtonGroup size="small" exclusive value={view} onChange={(_, v) => v && setView(v)}>
              <ToggleButton value="list" aria-label="Lista"><List /></ToggleButton>
              <ToggleButton value="calendar" aria-label="Calendário"><Calendar /></ToggleButton>
            </ToggleButtonGroup>
            {canEdit && <Button variant="contained" startIcon={<Plus />} onClick={() => setOpen(true)}>Novo show</Button>}
          </>
        }
      />
      <Card sx={{ p: 2, mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        <TextField
          placeholder="Buscar artista, cidade ou casa…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{ flex: '2 1 240px' }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }}
        />
        <TextField select label="Artista" value={artist} onChange={(e) => setArtist(e.target.value)} sx={{ flex: '1 1 160px' }}>
          <MenuItem value="">Todos</MenuItem>
          {artists.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
        </TextField>
        <TextField select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ flex: '1 1 140px' }}>
          <MenuItem value="">Todos</MenuItem>
          {SHOW_STATUS.map((s) => <MenuItem key={s} value={s}>{SHOW_STATUS_LABEL[s]}</MenuItem>)}
        </TextField>
        {view === 'list' && (
          <ToggleButtonGroup size="small" exclusive value={period} onChange={(_, v) => v && setPeriod(v)} sx={{ flex: '0 0 auto' }}>
            <ToggleButton value="upcoming">Próximos</ToggleButton>
            <ToggleButton value="past">Realizados</ToggleButton>
            <ToggleButton value="all">Todos</ToggleButton>
          </ToggleButtonGroup>
        )}
      </Card>

      {view === 'list' ? (
        <Card>
          <DataGrid
            rows={filtered}
            columns={columns}
            localeText={ptBR.components.MuiDataGrid.defaultProps.localeText}
            onRowClick={({ row }) => router.push(`/shows/${row.id}`)}
            initialState={{
              pagination: { paginationModel: { pageSize: 25 } },
              sorting: { sortModel: [{ field: 'date', sort: period === 'past' ? 'desc' : 'asc' }] },
            }}
            pageSizeOptions={[25, 50, 100]}
            rowHeight={60}
            disableRowSelectionOnClick
            autoHeight
            sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }}
          />
        </Card>
      ) : (
        <ShowsCalendar rows={filtered} />
      )}

      {open && <ShowFormDialog open onClose={() => setOpen(false)} artists={artists} contacts={contacts} />}
    </>
  );
}
