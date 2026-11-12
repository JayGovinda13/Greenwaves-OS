'use client';
import { useState } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { EditPencil, Eye, Plus } from 'iconoir-react';
import { deleteArtist, deleteMember, revealMemberDocs, saveMember } from '@/app/(app)/artistas/actions';
import { useToast } from '@/components/ui/Toast';
import { dayjs, fmtDate } from '@/lib/format';
import { ShowStatusChip } from '@/components/ui/StatusChip';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { F, FormSection } from '@/components/ui/FormSection';
import { useFormAction } from '@/components/ui/useFormAction';
import { dealLabel } from '@/components/shows/dealLabel';
import { TechRiderPanel } from '@/components/techrider/TechRiderPanel';
import type { TechRider } from '@/lib/techRider';

interface ShowItem {
  id: string; date: string; city: string | null; state: string | null; venue: string | null; status: string;
  dealType: string; fee: number | null; doorPercent: number | null; dealNotes: string | null; progress: { done: number; total: number };
}
interface Member {
  id: string; name: string; role: string | null; birthDate: Date | null; documentRg: string | null; documentCpf: string | null;
  phone: string | null; email: string | null; restrictions: string | null;
}

function MemberDialog({ artistId, member, onClose, canSeeDocs }: { artistId: string; member?: Member; onClose: () => void; canSeeDocs: boolean }) {
  const { submit, pending, err } = useFormAction((fd) => saveMember(artistId, member?.id ?? null, fd), onClose);
  const s = (x: string | null | undefined) => x ?? '';
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { component: 'form', onSubmit: submit } as object }}>
      <DialogTitle>{member ? 'Editar integrante' : 'Novo integrante'}</DialogTitle>
      <DialogContent dividers>
        <FormSection title="Dados da banda">
          <F span={4}><TextField name="name" label="Nome completo" required defaultValue={s(member?.name)} {...err('name')} /></F>
          <F span={2}><TextField name="role" label="Função" defaultValue={s(member?.role)} /></F>
          {canSeeDocs ? (
            <>
              <F span={2}><TextField name="birthDate" type="date" label="Nascimento" slotProps={{ inputLabel: { shrink: true } }} helperText={member?.birthDate ? 'Vazio = manter' : undefined} /></F>
              <F span={2}><TextField name="documentRg" label="RG" placeholder={member?.documentRg ? `manter ${member.documentRg}` : ''} helperText="Guardado criptografado" /></F>
              <F span={2}><TextField name="documentCpf" label="CPF" placeholder={member?.documentCpf ? `manter ${member.documentCpf}` : ''} helperText="Vazio = manter o atual" /></F>
            </>
          ) : (
            <F span={4}><Alert severity="info" sx={{ py: 0 }}>Documentos e nascimento: só a administração.</Alert></F>
          )}
          <F span={3}><TextField name="phone" label="Telefone" defaultValue={s(member?.phone)} /></F>
          <F span={3}><TextField name="email" type="email" label="E-mail" defaultValue={s(member?.email)} /></F>
          <F span={6}><TextField
            name="restrictions"
            label="Preferências / restrições"
            multiline
            minRows={2}
            defaultValue={s(member?.restrictions)}
            helperText="Descreva só a necessidade (ex.: vegano, sem glúten, sem amendoim). Não registre diagnósticos: dado de saúde é sensível (LGPD art. 11)."
          /></F>
        </FormSection>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="contained" disabled={pending}>Salvar</Button>
      </DialogActions>
    </Dialog>
  );
}

export function ArtistTabs({ artistId, shows, members, canEditMembers, canSeeDocs, canDelete, techRider, initialTab = 0 }: {
  artistId: string; shows: ShowItem[]; members: Member[]; canEditMembers: boolean; canSeeDocs: boolean; canDelete: boolean;
  techRider: TechRider | null; initialTab?: number;
}) {
  const [tab, setTab] = useState(initialTab);
  const [editing, setEditing] = useState<Member | 'new' | null>(null);
  const [revealed, setRevealed] = useState<{ name: string; rg: string | null; cpf: string | null; birthDate: string | null } | null>(null);
  const toast = useToast();
  const reveal = async (m: Member) => {
    const r = await revealMemberDocs(artistId, m.id);
    if (r.ok && r.data) setRevealed({ name: m.name, ...r.data });
    else if (!r.ok) toast(r.error, 'error');
  };
  const today = dayjs().format('YYYY-MM-DD');
  const upcoming = shows.filter((s) => s.date.slice(0, 10) >= today);
  const past = shows.filter((s) => s.date.slice(0, 10) < today).reverse();

  const showList = (list: ShowItem[]) =>
    list.length === 0 ? (
      <EmptyState title="Nenhum show aqui" />
    ) : (
      list.map((s) => (
        <Box
          key={s.id}
          component={Link}
          href={`/shows/${s.id}`}
          sx={{ display: 'grid', gridTemplateColumns: { xs: '70px 1fr', md: '90px 1.4fr 1fr 140px 130px' }, gap: 2, alignItems: 'center', px: 3, py: 1.5, borderTop: 1, borderColor: 'divider', color: 'inherit', textDecoration: 'none', '&:hover': { bgcolor: 'action.hover' } }}
        >
          <Box>
            <Typography fontWeight={900} sx={{ fontFamily: 'var(--font-display)', fontStretch: '125%' }}>{dayjs.utc(s.date).format('DD/MM')}</Typography>
            <Typography fontSize={12} color="text.secondary" textTransform="capitalize">{dayjs.utc(s.date).format('ddd YYYY')}</Typography>
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography fontWeight={700} noWrap>{s.venue ?? 'Local a definir'}</Typography>
            <Typography fontSize={13} color="text.secondary">{[s.city, s.state].filter(Boolean).join(' · ')}</Typography>
          </Box>
          <Typography sx={{ display: { xs: 'none', md: 'block' } }} fontWeight={600}>{dealLabel(s)}</Typography>
          <Box sx={{ display: { xs: 'none', md: 'block' } }}><ShowStatusChip status={s.status} /></Box>
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <LinearProgress variant="determinate" value={(s.progress.done / s.progress.total) * 100} sx={{ height: 6, borderRadius: 3 }} />
            <Typography fontSize={11} color="text.secondary">{s.progress.done}/{s.progress.total} produção</Typography>
          </Box>
        </Box>
      ))
    );

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, borderBottom: 1, borderColor: 'divider', flexWrap: 'wrap' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable">
          <Tab label={`Próximos shows (${upcoming.length})`} />
          <Tab label={`Histórico (${past.length})`} />
          <Tab label={`Integrantes (${members.length})`} />
          <Tab label="Ficha técnica & mapa de palco" />
        </Tabs>
        {tab === 2 && canEditMembers && (
          <Button size="small" startIcon={<Plus />} onClick={() => setEditing('new')}>Integrante</Button>
        )}
      </Box>
      {tab === 0 && showList(upcoming)}
      {tab === 1 && showList(past)}
      {tab === 2 &&
        (members.length === 0 ? (
          <EmptyState title="Sem dados da banda" description="Cadastre integrantes e equipe para agilizar listas, passagens e hospedagem." />
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', '& td, & th': { px: 2, py: 1.5, borderTop: 1, borderColor: 'divider', textAlign: 'left', fontSize: 14 }, '& th': { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.secondary', borderTop: 0 } }}>
              <thead>
                <tr><th>Nome</th><th>Função</th><th>Nascimento</th><th>RG</th><th>CPF</th><th>Contato</th><th>Restrições</th><th /></tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td><Typography fontWeight={700} fontSize={14}>{m.name}</Typography></td>
                    <td>{m.role ?? '—'}</td>
                    <td>{fmtDate(m.birthDate)}</td>
                    <td>{m.documentRg ?? '—'}</td>
                    <td>
                      {m.documentCpf ?? '—'}
                      {canSeeDocs && (m.documentRg || m.documentCpf) && (
                        <Tooltip title="Mostrar documentos (fica registrado)">
                          <IconButton size="small" onClick={() => reveal(m)} aria-label="Mostrar documentos"><Eye width={16} /></IconButton>
                        </Tooltip>
                      )}
                    </td>
                    <td>{[m.phone, m.email].filter(Boolean).join(' · ') || '—'}</td>
                    <td>{m.restrictions ?? '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {canEditMembers && (
                        <Tooltip title="Editar"><IconButton size="small" onClick={() => setEditing(m)}><EditPencil /></IconButton></Tooltip>
                      )}
                      {canSeeDocs && (
                        <ConfirmButton iconOnly label="Remover" title={`Remover ${m.name}?`} onConfirm={() => deleteMember(artistId, m.id)} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Box>
          </Box>
        ))}
      {tab === 3 && (
        <TechRiderPanel artistId={artistId} initial={techRider} members={members.map((m) => ({ name: m.name, role: m.role }))} canEdit={canEditMembers} />
      )}
      {canDelete && (
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'flex-end' }}>
          <ConfirmButton
            label="Excluir artista"
            title="Excluir artista do casting?"
            description="Todos os shows e integrantes deste artista serão removidos permanentemente. Considere marcar como inativo."
            onConfirm={() => deleteArtist(artistId)}
            buttonProps={{ size: 'small' }}
          />
        </Box>
      )}
      {revealed && (
        <Dialog open onClose={() => setRevealed(null)} maxWidth="xs" fullWidth>
          <DialogTitle>Documentos</DialogTitle>
          <DialogContent dividers>
            <Typography fontWeight={800} mb={1}>{revealed.name}</Typography>
            <Typography>RG: <b>{revealed.rg ?? '—'}</b></Typography>
            <Typography>CPF: <b>{revealed.cpf ?? '—'}</b></Typography>
            <Typography>Nascimento: <b>{revealed.birthDate ? fmtDate(revealed.birthDate) : '—'}</b></Typography>
            <Alert severity="info" sx={{ mt: 2 }}>Esta visualização foi registrada. Use apenas para a finalidade da produção (passagens, hospedagem, listas).</Alert>
          </DialogContent>
          <DialogActions><Button onClick={() => setRevealed(null)}>Fechar</Button></DialogActions>
        </Dialog>
      )}
      {editing && (
        <MemberDialog artistId={artistId} member={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} canSeeDocs={canSeeDocs} />
      )}
    </>
  );
}
