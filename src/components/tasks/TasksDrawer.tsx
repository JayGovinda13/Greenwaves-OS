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
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { Calendar, Plus, Trash, UserPlus, Xmark } from 'iconoir-react';
import { createTask, deleteTask, getTasksPanel, reassignTask, toggleTask, type TaskItem, type TasksPanelData } from '@/app/(app)/tarefas/actions';
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

function TaskRow({ t, me, onToggle, onDelete, onDelegate }: {
  t: TaskItem;
  me: string;
  onToggle: (t: TaskItem, v: boolean) => void;
  onDelete: (t: TaskItem) => void;
  onDelegate?: (t: TaskItem, el: HTMLElement) => void;
}) {
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
      {onDelegate && !done && (
        <Tooltip title={t.assignee?.id === me ? 'Delegar' : 'Delegar para outra pessoa'}>
          <IconButton size="small" color="primary" onClick={(e) => onDelegate(t, e.currentTarget)} sx={{ alignSelf: 'flex-start' }} aria-label="Delegar tarefa">
            <UserPlus width={18} />
          </IconButton>
        </Tooltip>
      )}
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

/** Menu com as pessoas da equipe (exceto eu) para delegar; sugere convidar se a equipe estiver vazia. */
function DelegateMenu({ anchor, onClose, members, me, exclude, onPick }: {
  anchor: HTMLElement | null;
  onClose: () => void;
  members: { id: string; name: string }[];
  me: string;
  exclude: (string | undefined)[];
  onPick: (id: string, name: string) => void;
}) {
  const others = members.filter((m) => !exclude.includes(m.id));
  return (
    <Menu anchorEl={anchor} open={!!anchor} onClose={onClose} slotProps={{ paper: { sx: { minWidth: 240 } } }}>
      <Typography variant="overline" color="text.secondary" sx={{ px: 2, display: 'block' }}>Delegar para</Typography>
      {others.map((m) => (
        <MenuItem key={m.id} onClick={() => { onClose(); onPick(m.id, m.name); }}>
          <Avatar sx={{ width: 26, height: 26, fontSize: 11, fontWeight: 800, mr: 1.25, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
            {initials(m.name)}
          </Avatar>
          {m.id === me ? `${m.name} (eu)` : m.name}
        </MenuItem>
      ))}
      {others.length === 0 && (
        <Box sx={{ px: 2, py: 1, maxWidth: 260 }}>
          <Typography variant="body2" color="text.secondary" mb={1.5}>
            Ainda não há outras pessoas na equipe. Convide alguém para poder delegar tarefas.
          </Typography>
          <Button component={Link} href="/configuracoes" size="small" variant="contained" startIcon={<UserPlus />} onClick={onClose}>
            Convidar pessoa
          </Button>
        </Box>
      )}
    </Menu>
  );
}

function NewTaskForm({ data, onCreated }: { data: TasksPanelData; onCreated: () => void }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [more, setMore] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const empty = { title: '', dueDate: '', priority: 'NORMAL' as TaskPriority, showId: '', description: '' };
  const [v, setV] = useState(empty);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });

  const create = (assigneeId: string) => {
    if (!v.title.trim()) {
      toast('Escreva a tarefa antes.', 'warning');
      return;
    }
    const fd = new FormData();
    Object.entries({ ...v, assigneeId }).forEach(([k, val]) => fd.set(k, val));
    start(async () => {
      const r = await createTask(fd);
      if (r.ok) {
        toast(r.message ?? 'Tarefa criada.');
        setV(empty);
        setMore(false);
        onCreated();
      } else toast(r.error, 'error');
    });
  };

  return (
    <Box component="form" onSubmit={(e) => { e.preventDefault(); create(data.me); }} sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <TextField
        placeholder="Nova tarefa… ex.: Enviar rider para o Circo Voador"
        value={v.title}
        onChange={set('title')}
        slotProps={{ htmlInput: { maxLength: 200 } }}
      />
      <Collapse in={more}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, pt: 0.5 }}>
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
        </Box>
      </Collapse>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button size="small" onClick={() => setMore(!more)} sx={{ mr: 'auto', px: 1, whiteSpace: 'nowrap' }}>
          {more ? '− Menos opções' : '+ Prazo e mais'}
        </Button>
        <Button type="submit" variant="outlined" disabled={pending} startIcon={<Plus />} sx={{ whiteSpace: 'nowrap' }}>Para mim</Button>
        <Button variant="contained" color="secondary" disabled={pending} startIcon={<UserPlus />} onClick={(e) => setAnchor(e.currentTarget)} sx={{ whiteSpace: 'nowrap' }}>
          Delegar
        </Button>
      </Box>
      <DelegateMenu anchor={anchor} onClose={() => setAnchor(null)} members={data.members} me={data.me} exclude={[data.me]} onPick={(id) => create(id)} />
    </Box>
  );
}

export function TasksDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<TasksPanelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<TabKey>('mine');
  const [delegating, setDelegating] = useState<{ task: TaskItem; el: HTMLElement } | null>(null);

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
  const onReassign = async (t: TaskItem, assigneeId: string) => {
    const r = await reassignTask(t.id, assigneeId);
    toast(r.ok ? r.message ?? 'Delegada.' : r.error, r.ok ? 'success' : 'error');
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
        {me &&
          lists[tab].map((t) => (
            <TaskRow
              key={t.id}
              t={t}
              me={me}
              onToggle={onToggle}
              onDelete={onDelete}
              onDelegate={data?.canCreate && (t.assignee?.id === me || t.creator?.id === me) ? (task, el) => setDelegating({ task, el }) : undefined}
            />
          ))}
      </Box>
      {data && delegating && (
        <DelegateMenu
          anchor={delegating.el}
          onClose={() => setDelegating(null)}
          members={data.members}
          me={data.me}
          exclude={[delegating.task.assignee?.id]}
          onPick={(id) => onReassign(delegating.task, id)}
        />
      )}
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
