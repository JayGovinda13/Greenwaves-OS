'use client';
import { useState, useTransition } from 'react';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Download, Import, UserPlus } from 'iconoir-react';
import { changePassword, changeRole, importWorkbook, inviteMember, removeMember, saveOrganization } from '@/app/(app)/configuracoes/actions';
import { ROLES, ROLE_LABEL, ROLE_RANK, type Role } from '@/lib/domain';
import { initials } from '@/lib/format';
import type { ImportSummary } from '@/lib/importers/greenwave-xlsx';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { useFormAction } from '@/components/ui/useFormAction';
import { useToast } from '@/components/ui/Toast';

interface Member { id: string; role: Role; name: string; email: string; isMe: boolean }
interface Org { name: string; email: string | null; phone: string | null; instagram: string | null; city: string | null; plan: string; slug: string }

const ROLE_HELP: Record<Role, string> = {
  OWNER: 'Acesso total, incluindo excluir artistas e gerenciar sócios.',
  ADMIN: 'Financeiro, documentos da banda, equipe e importações.',
  PRODUCER: 'Agenda, checklist, contratantes e integrantes (sem documentos).',
  VIEWER: 'Apenas leitura.',
  ARTIST: 'Portal da banda: só os próprios shows e documentos, sem valores.',
};

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="h5">{title}</Typography>
      {subtitle && <Typography variant="body2" color="text.secondary" mt={0.5}>{subtitle}</Typography>}
      <Box sx={{ mt: 2.5 }}>{children}</Box>
    </Card>
  );
}

export function SettingsView({ org, members, myRole, canAdmin }: { org: Org; members: Member[]; myRole: Role; canAdmin: boolean }) {
  const toast = useToast();
  const [, start] = useTransition();
  const orgForm = useFormAction(saveOrganization);
  const pwdForm = useFormAction(changePassword);
  const [tempPwd, setTempPwd] = useState<string | null>(null);
  const invite = useFormAction(inviteMember, (d) => setTempPwd(d?.tempPassword ?? null));
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const importForm = useFormAction(importWorkbook, (d) => setSummary(d ?? null));

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3, alignItems: 'start' }}>
      <Section title="Produtora" subtitle={`Plano ${org.plan} · identificador ${org.slug}`}>
        <Box component="form" onSubmit={orgForm.submit} sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <TextField name="name" label="Nome" defaultValue={org.name} disabled={!canAdmin} sx={{ gridColumn: 'span 2' }} {...orgForm.err('name')} />
          <TextField name="email" label="E-mail para shows" defaultValue={org.email ?? ''} disabled={!canAdmin} />
          <TextField name="phone" label="Telefone" defaultValue={org.phone ?? ''} disabled={!canAdmin} />
          <TextField name="instagram" label="Instagram" defaultValue={org.instagram ?? ''} disabled={!canAdmin} />
          <TextField name="city" label="Cidade" defaultValue={org.city ?? ''} disabled={!canAdmin} />
          {canAdmin && (
            <Box sx={{ gridColumn: 'span 2' }}>
              <Button type="submit" variant="contained" disabled={orgForm.pending}>Salvar</Button>
            </Box>
          )}
        </Box>
      </Section>

      <Section title="Importar planilha" subtitle="Baixe o modelo, preencha e envie o arquivo (.xlsx): artistas, shows, dados das bandas, contatos e fechamentos. Reimportar não duplica registros.">
        {canAdmin ? (
          <Box component="form" onSubmit={importForm.submit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ p: 2, borderRadius: 3, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 220px' }}>
                <Typography fontWeight={700}>Modelo de planilha</Typography>
                <Typography variant="body2" color="text.secondary">
                  Abas prontas com instruções, exemplos nos cabeçalhos e lista dos seus artistas.
                </Typography>
              </Box>
              <Button component="a" href="/api/modelo-planilha" variant="contained" color="secondary" startIcon={<Download />}>
                Baixar modelo
              </Button>
            </Box>
            <Button component="label" variant="outlined" startIcon={<Import />} sx={{ alignSelf: 'flex-start' }}>
              Escolher arquivo .xlsx
              <input
                hidden
                type="file"
                name="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) toast(`Selecionado: ${f.name}`, 'info');
                }}
              />
            </Button>
            <Button type="submit" variant="contained" disabled={importForm.pending} sx={{ alignSelf: 'flex-start' }}>
              {importForm.pending ? 'Importando…' : 'Importar'}
            </Button>
            {summary && (
              <Alert severity="success">
                {summary.showsCreated} shows novos · {summary.showsUpdated} atualizados · {summary.artistsCreated} artistas novos · {summary.artistsUpdated} artistas atualizados ·{' '}
                {summary.membersCreated} integrantes · {summary.contactsCreated} contatos · {summary.settlementsLinked} fechamentos vinculados
              </Alert>
            )}
          </Box>
        ) : (
          <Alert severity="info">Apenas administração pode importar planilhas.</Alert>
        )}
      </Section>

      <Section title="Equipe e permissões" subtitle="Controle de acesso por papel.">
        {members.map((m) => (
          <Box key={m.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.25, borderTop: 1, borderColor: 'divider' }}>
            <Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 800, width: 38, height: 38, fontSize: 14 }}>{initials(m.name)}</Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography fontWeight={700} noWrap>{m.name} {m.isMe && <Chip size="small" label="você" sx={{ ml: 0.5 }} />}</Typography>
              <Typography variant="body2" color="text.secondary" noWrap>{m.email}</Typography>
            </Box>
            <TextField
              select
              size="small"
              value={m.role}
              disabled={!canAdmin || m.isMe || ROLE_RANK[m.role] > ROLE_RANK[myRole]}
              onChange={(e) => start(async () => { const r = await changeRole(m.id, e.target.value as Role); toast(r.ok ? r.message! : r.error, r.ok ? 'success' : 'error'); })}
              sx={{ width: 160 }}
              fullWidth={false}
            >
              {ROLES.map((r) => <MenuItem key={r} value={r} disabled={ROLE_RANK[r] > ROLE_RANK[myRole]}>{ROLE_LABEL[r]}</MenuItem>)}
            </TextField>
            {canAdmin && !m.isMe && <ConfirmButton iconOnly label="Remover" title={`Remover ${m.name} da equipe?`} onConfirm={() => removeMember(m.id)} />}
          </Box>
        ))}
        {canAdmin && (
          <Box component="form" onSubmit={invite.submit} sx={{ mt: 2.5, pt: 2.5, borderTop: 1, borderColor: 'divider', display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 150px auto' }, gap: 1.5 }}>
            <TextField name="name" label="Nome" required {...invite.err('name')} />
            <TextField name="email" type="email" label="E-mail" required {...invite.err('email')} />
            <TextField select name="role" label="Papel" defaultValue="PRODUCER">
              {ROLES.map((r) => <MenuItem key={r} value={r} disabled={ROLE_RANK[r] > ROLE_RANK[myRole]}>{ROLE_LABEL[r]}</MenuItem>)}
            </TextField>
            <Button type="submit" variant="contained" startIcon={<UserPlus />} disabled={invite.pending}>Adicionar</Button>
          </Box>
        )}
        {tempPwd && (
          <Alert severity="warning" sx={{ mt: 2 }} onClose={() => setTempPwd(null)}>
            Senha temporária: <b>{tempPwd}</b> — envie para a pessoa; ela será exibida apenas agora.
          </Alert>
        )}
        <Box sx={{ mt: 2.5, display: 'grid', gap: 0.75 }}>
          {ROLES.map((r) => (
            <Typography key={r} variant="body2" color="text.secondary"><b>{ROLE_LABEL[r]}:</b> {ROLE_HELP[r]}</Typography>
          ))}
        </Box>
      </Section>

      <Section title="Minha conta" subtitle="Altere sua senha de acesso.">
        <Box component="form" onSubmit={pwdForm.submit} sx={{ display: 'grid', gap: 2, maxWidth: 360 }}>
          <TextField name="current" type="password" label="Senha atual" required autoComplete="current-password" />
          <TextField name="next" type="password" label="Nova senha" required autoComplete="new-password" {...pwdForm.err('next')} />
          <Button type="submit" variant="contained" disabled={pwdForm.pending} sx={{ justifySelf: 'start' }}>Alterar senha</Button>
        </Box>
      </Section>
    </Box>
  );
}
