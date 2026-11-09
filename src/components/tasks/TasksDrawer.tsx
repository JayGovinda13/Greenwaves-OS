'use client';
import { useCallback, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Autocomplete from '@mui/material/Autocomplete';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { ArrowRight, Calendar, Plus, Trash, Xmark } from 'iconoir-react';
import { createTask, deleteTask, getTasksPanel, toggleTask, type TaskItem, type TasksPanelData } from '@/app/(app)/tarefas/actions';
import { TASK_PRIORITIES, TASK_PRIORITY_LABEL, type TaskPriority } from '@/lib/domain';
import { dayjs, initials } from '@/lib/format';
import { useToast } from '@/components/ui/Toast';
import { BRAND, FOREST_GRADIENT } from '@/theme/brand';

type TabKey = 'mine' | 'delegated' | 'done';

function dueInfo(due: string | null, done: boolean) {
  if (!due) return null;
  const d = dayjs.utc(due);
  const today = dayjs.utc(dayjs().format('YYYY-MM-DD'));
  const diff = d.diff(today, 'day');
  const label = diff === 0 ? 'Hoje' : diff === 1 ? 'Amanhã' : d.format('DD/MM');
  const color = done ? 'text.secondary' : diff < 0 ? 'error.main' : diff <= 1 ? 'warning.main' : 'text.secondary';
  return { label: !done && diff < 0 ? `Venceu ${d.format('DD/MM')}` : label, color };
}

function TaskRow({ t, me, onToggle, onDelete }: { t: TaskItem; me: string; onToggle: (t: TaskItem, v: boolean) => void; onDelete: (t: TaskItem) => void }) {
  const done = t.status === 'DONE';
  const due = dueInfo(t.dueDate, done);
  const delegatedByMe = t.creator?.id === me && t.assignee?.id !== me;
  const canToggle = t.assignee?.id === me || t.creator?.id === me;
  return (
    <Box sx={{ display: 'flex', gap: 1, px: 2, py: 1.25, borderTop: 1, borderColor: 'divider', '&:hover .gw-del': { opacity: 1 } }}>
      <Checkbox checked={done} disabled={!canToggle} onChange={(e) => onToggle(t, e.target.checked)} sx={{ mt: -0.75, ml: -1 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography fontWeight={700} sx={{ textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.6 : 1, wordBreak: 'break-word' }}>
          {t.title}
        </Typography>
        {t.description && (
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', mt: 0.25 }}>{t.description}</Typography>
        )}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.75, mt: 0.75 }}>
          {t.priority === 'HIGH' && <Chip size="small" color="error" label="Alta" />}
          {t.priority === 'LOW' && <Chip size="small" variant="outlined" label="Baixa" />}
          {due && (
            <Typography variant="caption" sx={{ color: due.color, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 0.4 }}>
              <Calendar width={13} height={13} /> {due.label}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            {delegatedByMe ? (
              <>para <b>{t.assignee?.name ?? '—'}</b></>
            ) : t.creator && t.creator.id !== me ? (
              <>de <b>{t.creator.name}</b></>
            ) : (
              'pessoal'
            )}
          </Typography>
          {t.show && (
            <Typography component={Link} href={`/shows/${t.show.id}`} variant="caption" sx={{ color: 'primary.main', fontWeight: 700, textDecoration: 'none' }}>
              {t.show.label} →
            </Typography>
          )}
        </Box>
      </Box>
      {t.canDelete && (
        <Tooltip title="Excluir">
          <IconButton className="gw-del" size="small" onClick={() => onDelete(t)} sx={{ opacity: { xs: 1, md: 0 }, alignSelf: 'flex-start', transition: 'opacity .15s' }}>
            <Trash width={18} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}

function NewTaskForm({ data, onCreated }: { data: TasksPanelData; onCreated: () => void }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [v, setV] = useState({ title: '', assigneeId: data.me, dueDate: '', priority: 'NORMAL' as TaskPriority, showId: '', description: '' });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.title.trim()) return;
    const fd = new FormData();
    Object.entries(v).forEach(([k, val]) => fd.set(k, val));
    start(async () => {
      const r = await createTask(fd);
      if (r.ok) {
        toast(r.message ?? 'Tarefa criada.');
        setV({ ...v, title: '', description: '', showId: '', dueDate: '', priority: 'NORMAL' });
        setExpanded(false);
        onCreated();
      } else toast(r.error, 'error');
    });
  };

  return (
    <Box component="form" onSubmit={submit} sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <TextField
        placeholder="Nova tarefa… ex.: Enviar rider para o Circo Voador"
        value={v.title}
        onChange={set('title')}
        onFocus={() => setExpanded(true)}
        slotProps={{ htmlInput: { maxLength: 200 } }}
      />
      <Collapse in={expanded || !!v.title}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <TextField select label="Responsável" value={v.assigneeId} onChange={set('assigneeId')} sx={{ gridColumn: 'span 2' }}>
            {data.members.map((m) => (
              <MenuItem key={m.id} value={m.id}>{m.id === data.me ? `${m.name} (eu)` : m.name}</MenuItem>
            ))}
          </TextField>
          <TextField type="date" label="Prazo" value={v.dueDate} onChange={set('dueDate')} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField select label="Prioridade" value={v.priority} onChange={set('priority')}>
            {TASK_PRIORITIES.map((p) => <MenuItem key={p} value={p}>{TASK_PRIORITY_LABEL[p]}</MenuItem>)}
          </TextField>
          <Autocomplete
            size="small"
            options={data.shows}
            value={data.shows.find((s) => s.id === v.showId) ?? null}
            onChange={(_, s) => setV({ ...v, showId: s?.id ?? '' })}
            getOptionLabel={(s) => s.label}
            noOptionsText="Nenhum show encontrado"
            renderInput={(p) => <TextField {...p} label="Show (opcional)" placeholder="Busque por artista ou cidade" />}
            sx={{ gridColumn: 'span 2' }}
          />
          <TextField label="Detalhes (opcional)" multiline minRows={2} value={v.description} onChange={set('description')} sx={{ gridColumn: 'span 2' }} />
          <Box sx={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={() => { setExpanded(false); setV({ ...v, title: '' }); }}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={pending || !v.title.trim()} endIcon={v.assigneeId === data.me ? <Plus /> : <ArrowRight />}>
              {v.assigneeId === data.me ? 'Criar tarefa' : 'Delegar'}
            </Button>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}

export function TasksDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<TasksPanelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<TabKey>('mine');

  const load = useCallback(async () => {
    setLoading(true);
    const r = await getTasksPanel();
    setLoading(false);
    if (r.ok && r.data) setData(r.data);
    else if (!r.ok) toast(r.error, 'error');
  }, [toast]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const refresh = () => {
    load();
    router.refresh(); // atualiza o contador do cabeçalho
  };

  const onToggle = async (t: TaskItem, done: boolean) => {
    setData((d) => d && { ...d, tasks: d.tasks.map((x) => (x.id === t.id ? { ...x, status: done ? 'DONE' : 'TODO' } : x)) });
    const r = await toggleTask(t.id, done);
    if (!r.ok) toast(r.error, 'error');
    else if (done) toast('Tarefa concluída. 🤘');
    refresh();
  };
  const onDelete = async (t: TaskItem) => {
    const r = await deleteTask(t.id);
    toast(r.ok ? r.message ?? 'Excluída.' : r.error, r.ok ? 'success' : 'error');
    refresh();
  };

  const me = data?.me;
  const open_ = data?.tasks.filter((t) => t.status !== 'DONE') ?? [];
  const lists: Record<TabKey, TaskItem[]> = {
    mine: open_.filter((t) => t.assignee?.id === me),
    delegated: open_.filter((t) => t.creator?.id === me && t.assignee?.id !== me),
    done: data?.tasks.filter((t) => t.status === 'DONE').sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')) ?? [],
  };
  const EMPTY: Record<TabKey, string> = {
    mine: 'Nada pendente com você. Bora pro próximo show!',
    delegated: 'Você não delegou nenhuma tarefa em aberto.',
    done: 'Nenhuma tarefa concluída nos últimos 30 dias.',
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 440 }, display: 'flex', flexDirection: 'column' } } }}>
      <Box sx={{ background: FOREST_GRADIENT, color: BRAND.cream, px: 2.5, pt: 2.5, pb: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="overline" sx={{ color: BRAND.lime }}>Equipe</Typography>
          <Typography variant="h4" component="h2">Tarefas</Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: BRAND.cream }} aria-label="Fechar"><Xmark /></IconButton>
      </Box>
      {loading && <LinearProgress color="secondary" sx={{ height: 3 }} />}
      {data?.canCreate && <NewTaskForm data={data} onCreated={refresh} />}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="mine" label={`Para mim (${lists.mine.length})`} />
        <Tab value="delegated" label={`Delegadas (${lists.delegated.length})`} />
        <Tab value="done" label="Concluídas" />
      </Tabs>
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {data && lists[tab].length === 0 && (
          <Typography color="text.secondary" sx={{ p: 4, textAlign: 'center' }}>{EMPTY[tab]}</Typography>
        )}
        {me && lists[tab].map((t) => <TaskRow key={t.id} t={t} me={me} onToggle={onToggle} onDelete={onDelete} />)}
      </Box>
      {data && data.members.length > 1 && (
        <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">Equipe:</Typography>
          {data.members.slice(0, 8).map((m) => (
            <Tooltip key={m.id} title={m.name}>
              <Avatar sx={{ width: 26, height: 26, fontSize: 11, fontWeight: 800, bgcolor: m.id === me ? 'secondary.main' : 'primary.main', color: m.id === me ? 'secondary.contrastText' : 'primary.contrastText' }}>
                {initials(m.name)}
              </Avatar>
            </Tooltip>
          ))}
        </Box>
      )}
    </Drawer>
  );
}
