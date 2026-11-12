'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Download, Search, ShieldCheck, Trash } from 'iconoir-react';
import {
  anonymizeDataSubject, deleteMyAccount, exportDataSubject, exportMyData, saveDpo, searchDataSubject, type SubjectHit,
} from '@/app/(app)/configuracoes/lgpd-actions';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { useFormAction } from '@/components/ui/useFormAction';
import { useToast } from '@/components/ui/Toast';

function download(filename: string, json: string) {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function PrivacySection({ isAdmin, dpoName, dpoEmail, retention }: {
  isAdmin: boolean;
  dpoName: string | null;
  dpoEmail: string | null;
  retention: { activityMonths: number; mcpLogDays: number; loginAttemptDays: number };
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const dpo = useFormAction(saveDpo);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SubjectHit[] | null>(null);
  const [delOpen, setDelOpen] = useState(false);
  const [confirm, setConfirm] = useState('');

  const search = () =>
    start(async () => {
      const r = await searchDataSubject(q);
      if (r.ok) setHits(r.data ?? []);
      else toast(r.error, 'error');
    });

  return (
    <Card sx={{ p: 3, gridColumn: '1 / -1' }}>
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
        <ShieldCheck />
        <Typography variant="h5">Privacidade e LGPD</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" mt={0.5} maxWidth={760}>
        A produtora é a controladora dos dados que cadastra. Aqui ficam o(a) encarregado(a), o atendimento a pedidos de titulares
        (integrantes, contratantes e usuários) e os seus próprios dados. <a href="/privacidade" target="_blank" style={{ color: 'inherit', fontWeight: 700 }}>Política de Privacidade</a>
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1.3fr' }, gap: 3, mt: 3 }}>
        <Box>
          <Typography variant="overline" color="primary.main">Encarregado(a) de dados (DPO)</Typography>
          {isAdmin ? (
            <Box component="form" onSubmit={dpo.submit} sx={{ display: 'grid', gap: 1.5, mt: 1 }}>
              <TextField name="dpoName" label="Nome" defaultValue={dpoName ?? ''} />
              <TextField name="dpoEmail" label="E-mail para pedidos de titulares" defaultValue={dpoEmail ?? ''} {...dpo.err('dpoEmail')} />
              <Button type="submit" variant="outlined" disabled={dpo.pending} sx={{ justifySelf: 'start' }}>Salvar</Button>
            </Box>
          ) : (
            <Typography mt={1}>{dpoName || dpoEmail ? `${dpoName ?? ''} ${dpoEmail ? `· ${dpoEmail}` : ''}` : 'Não informado.'}</Typography>
          )}

          <Typography variant="overline" color="primary.main" sx={{ display: 'block', mt: 3 }}>Retenção automática</Typography>
          <Typography variant="body2" color="text.secondary">
            Atividade da equipe: {retention.activityMonths} meses · Uso da integração com IA: {retention.mcpLogDays} dias ·
            Tentativas de login: {retention.loginAttemptDays} dias. Depois disso os registros são apagados automaticamente.
          </Typography>

          <Typography variant="overline" color="primary.main" sx={{ display: 'block', mt: 3 }}>Meus dados</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Download />}
              disabled={pending}
              onClick={() => start(async () => { const r = await exportMyData(); if (r.ok && r.data) download(r.data.filename, r.data.json); else if (!r.ok) toast(r.error, 'error'); })}
            >
              Baixar meus dados
            </Button>
            <Button color="error" variant="outlined" startIcon={<Trash />} onClick={() => setDelOpen(true)}>Excluir minha conta</Button>
          </Box>
        </Box>

        <Box>
          <Typography variant="overline" color="primary.main">Pedidos de titulares (art. 18)</Typography>
          {isAdmin ? (
            <>
              <Typography variant="body2" color="text.secondary" mb={1.5}>
                Quando alguém pedir acesso, cópia ou exclusão dos próprios dados, busque pelo nome, e-mail ou telefone. Exporte para enviar à pessoa
                ou anonimize: o histórico de shows e valores é mantido, mas sem identificá-la. Responda em até 15 dias.
              </Typography>
              <Box component="form" onSubmit={(e) => { e.preventDefault(); search(); }} sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Nome, e-mail ou telefone"
                  slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }}
                />
                <Button type="submit" variant="contained" disabled={pending}>Buscar</Button>
              </Box>
              {hits && hits.length === 0 && <Typography color="text.secondary" mt={2}>Nada encontrado.</Typography>}
              {hits?.map((h) => (
                <Box key={`${h.kind}-${h.id}`} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1.25, borderTop: 1, borderColor: 'divider', mt: 1, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1, minWidth: 180 }}>
                    <Typography fontWeight={700}>{h.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{h.where}{h.detail ? ` · ${h.detail}` : ''}</Typography>
                  </Box>
                  <Button
                    size="small"
                    startIcon={<Download />}
                    onClick={() => start(async () => { const r = await exportDataSubject(h.kind, h.id); if (r.ok && r.data) download(r.data.filename, r.data.json); else if (!r.ok) toast(r.error, 'error'); })}
                  >
                    Exportar
                  </Button>
                  {h.kind !== 'user' && (
                    <ConfirmButton
                      label="Anonimizar"
                      title={`Anonimizar ${h.name}?`}
                      description="Nome, contatos e documentos são apagados; shows e valores continuam no histórico, sem identificar a pessoa. Não dá para desfazer."
                      onConfirm={async () => { const r = await anonymizeDataSubject(h.kind, h.id); if (r.ok) setHits((x) => x?.filter((y) => !(y.kind === h.kind && y.id === h.id)) ?? null); return r; }}
                      buttonProps={{ size: 'small' }}
                    />
                  )}
                </Box>
              ))}
            </>
          ) : (
            <Alert severity="info" sx={{ mt: 1 }}>Pedidos de titulares são atendidos pela administração da produtora.</Alert>
          )}
        </Box>
      </Box>

      <Dialog open={delOpen} onClose={() => setDelOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Excluir minha conta</DialogTitle>
        <DialogContent dividers>
          <Typography color="text.secondary" mb={2}>
            Sua conta, vínculos e chaves de integração são apagados. Registros de atividade e tarefas ficam sem seu nome. Se você for a única
            pessoa de uma produtora, ela e todos os dados dela também serão apagados. Não dá para desfazer.
          </Typography>
          <TextField label="Digite seu e-mail para confirmar" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDelOpen(false)}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            disabled={pending || !confirm}
            onClick={() => start(async () => { const r = await deleteMyAccount(confirm); if (r.ok) router.push('/login'); else toast(r.error, 'error'); })}
          >
            Excluir definitivamente
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
