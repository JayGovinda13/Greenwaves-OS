'use client';
import { useState, useTransition } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { Copy, Key, ShieldCheck } from 'iconoir-react';
import { createApiToken, revokeApiToken, setAiIntegration } from '@/app/(app)/configuracoes/actions';
import { dayjs } from '@/lib/format';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { useFormAction } from '@/components/ui/useFormAction';
import { useToast } from '@/components/ui/Toast';

export interface TokenRow {
  id: string; name: string; prefix: string; scope: string; owner: string; mine: boolean;
  createdAt: string; expiresAt: string; lastUsedAt: string | null; revokedAt: string | null;
}
export interface LogRow { id: string; at: string; user: string | null; tool: string; ok: boolean; summary: string | null; personalData: boolean }

const PRIVACY_NOTICE = [
  'Ao conectar, as informações que o Claude consultar (shows, artistas, contratantes, financeiro e tarefas) são enviadas à Anthropic, empresa sediada nos EUA, para gerar as respostas. Isso é uma transferência internacional de dados (LGPD, art. 33).',
  'Documentos pessoais (RG, CPF), datas de nascimento e preferências/restrições dos integrantes nunca são enviados. Telefone e e-mail de contratantes só são enviados quando você pede o contato de um contratante específico.',
  'Cada uso fica registrado (o quê, quando e por quem) por 180 dias. Você pode revogar sua chave a qualquer momento.',
];

function Copyable({ value }: { value: string }) {
  const toast = useToast();
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, pl: 1.5, borderRadius: 2, bgcolor: 'action.hover', fontFamily: 'monospace', fontSize: 13, wordBreak: 'break-all' }}>
      <Box sx={{ flex: 1 }}>{value}</Box>
      <Tooltip title="Copiar">
        <IconButton size="small" onClick={() => { navigator.clipboard.writeText(value); toast('Copiado.'); }}><Copy width={18} /></IconButton>
      </Tooltip>
    </Box>
  );
}

export function AiIntegrationSection({ enabled, enabledInfo, isOwner, canWrite, isAdmin, tokens, logs, mcpUrl }: {
  enabled: boolean;
  enabledInfo: string | null;
  isOwner: boolean;
  canWrite: boolean;
  isAdmin: boolean;
  tokens: TokenRow[];
  logs: LogRow[];
  mcpUrl: string;
}) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [newToken, setNewToken] = useState<string | null>(null);
  const [ownerAccept, setOwnerAccept] = useState(false);
  const form = useFormAction(createApiToken, (d) => setNewToken(d?.token ?? null));
  const active = tokens.filter((t) => !t.revokedAt && dayjs(t.expiresAt).isAfter(dayjs()));

  return (
    <Card sx={{ p: 3, gridColumn: '1 / -1' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h5">Integração com Claude (MCP)</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5} maxWidth={720}>
            Conecte o Claude (claude.ai, app de desktop, celular ou Claude Code) aos dados da produtora para consultar a agenda, criar shows,
            atualizar vendas, delegar tarefas e acompanhar o financeiro conversando.
          </Typography>
        </Box>
        <Chip icon={<ShieldCheck width={16} />} label={enabled ? 'Ativada' : 'Desativada'} color={enabled ? 'success' : 'default'} variant={enabled ? 'filled' : 'outlined'} />
      </Box>

      {/* Decisão do controlador: só sócios(as) ativam, com ciência do aviso */}
      <Box sx={{ mt: 2.5, p: 2, borderRadius: 3, border: 1, borderColor: 'divider' }}>
        <Typography fontWeight={800} mb={1}>Privacidade e LGPD</Typography>
        {PRIVACY_NOTICE.map((p) => <Typography key={p} variant="body2" color="text.secondary" mb={0.75}>• {p}</Typography>)}
        {isOwner ? (
          enabled ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1.5, flexWrap: 'wrap' }}>
              <Typography variant="body2" color="text.secondary">{enabledInfo}</Typography>
              <ConfirmButton
                label="Desativar integração"
                title="Desativar a integração com IA?"
                description="Todas as chaves da produtora serão revogadas imediatamente e o Claude perde o acesso."
                onConfirm={() => setAiIntegration(false)}
                buttonProps={{ size: 'small' }}
              />
            </Box>
          ) : (
            <Box sx={{ mt: 1.5 }}>
              <FormControlLabel
                control={<Checkbox checked={ownerAccept} onChange={(e) => setOwnerAccept(e.target.checked)} />}
                label="Como sócio(a), autorizo o uso da integração pela equipe e confirmo ciência da transferência internacional de dados descrita acima."
              />
              <Box>
                <Button
                  variant="contained"
                  disabled={!ownerAccept || pending}
                  startIcon={<Switch size="small" checked={false} />}
                  onClick={() => start(async () => { const r = await setAiIntegration(true); toast(r.ok ? r.message! : r.error, r.ok ? 'success' : 'error'); })}
                >
                  Ativar integração
                </Button>
              </Box>
            </Box>
          )
        ) : !enabled ? (
          <Alert severity="info" sx={{ mt: 1.5 }}>A integração precisa ser ativada por um(a) sócio(a) da produtora.</Alert>
        ) : (
          <Typography variant="body2" color="text.secondary" mt={1}>{enabledInfo}</Typography>
        )}
      </Box>

      {enabled && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3, mt: 3 }}>
          <Box>
            <Typography variant="overline" color="primary.main">1. Gere sua chave pessoal</Typography>
            {newToken ? (
              <Alert severity="warning" sx={{ mt: 1 }} onClose={() => setNewToken(null)}>
                <Typography fontWeight={700} mb={1}>Copie agora: esta chave não será exibida de novo.</Typography>
                <Copyable value={newToken} />
              </Alert>
            ) : (
              <Box component="form" onSubmit={form.submit} sx={{ display: 'grid', gap: 1.5, mt: 1 }}>
                <TextField name="name" label="Nome da chave" placeholder="Ex.: Claude no meu notebook" required {...form.err('name')} />
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <TextField select name="scope" label="Permissão" defaultValue={canWrite ? 'WRITE' : 'READ'}>
                    <MenuItem value="READ">Somente consultar</MenuItem>
                    <MenuItem value="WRITE" disabled={!canWrite}>Consultar e alterar</MenuItem>
                  </TextField>
                  <TextField select name="ttl" label="Validade" defaultValue="90">
                    <MenuItem value="30">30 dias</MenuItem>
                    <MenuItem value="90">90 dias</MenuItem>
                    <MenuItem value="180">180 dias</MenuItem>
                  </TextField>
                </Box>
                <FormControlLabel control={<Checkbox name="accept" />} label="Li o aviso de privacidade acima e uso esta chave apenas para o trabalho da produtora." />
                {form.err('accept').helperText && <Typography variant="caption" color="error">{form.err('accept').helperText}</Typography>}
                <Button type="submit" variant="contained" startIcon={<Key />} disabled={form.pending} sx={{ justifySelf: 'start' }}>Gerar chave</Button>
              </Box>
            )}

            <Typography variant="overline" color="primary.main" sx={{ display: 'block', mt: 3 }}>2. Adicione o conector no Claude</Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              <b>claude.ai / app:</b> Configurações → Conectores → Adicionar conector personalizado. Em <i>URL</i> use o endereço abaixo; em autenticação,
              escolha <i>sem login</i> e adicione o cabeçalho <code>Authorization</code> com o valor <code>Bearer SUA_CHAVE</code>.
            </Typography>
            <Box sx={{ mt: 1 }}><Copyable value={mcpUrl} /></Box>
            <Typography variant="body2" sx={{ mt: 1.5 }}><b>Claude Code</b> (terminal):</Typography>
            <Box sx={{ mt: 0.5 }}>
              <Copyable value={`claude mcp add --transport http greenwaves ${mcpUrl} --header "Authorization: Bearer SUA_CHAVE"`} />
            </Box>
          </Box>

          <Box>
            <Typography variant="overline" color="primary.main">{isAdmin ? 'Chaves da equipe' : 'Suas chaves'}</Typography>
            {tokens.length === 0 && <Typography variant="body2" color="text.secondary" mt={1}>Nenhuma chave criada.</Typography>}
            {tokens.map((t) => {
              const expired = dayjs(t.expiresAt).isBefore(dayjs());
              const status = t.revokedAt ? 'Revogada' : expired ? 'Expirada' : 'Ativa';
              return (
                <Box key={t.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, borderTop: 1, borderColor: 'divider', opacity: status === 'Ativa' ? 1 : 0.55 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={700} noWrap>{t.name} <Typography component="span" variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{t.prefix}…</Typography></Typography>
                    <Typography variant="body2" color="text.secondary">
                      {isAdmin && !t.mine ? `${t.owner} · ` : ''}{t.scope === 'WRITE' ? 'consultar e alterar' : 'somente consultar'} · expira {dayjs(t.expiresAt).format('DD/MM/YYYY')}
                      {t.lastUsedAt ? ` · usada ${dayjs(t.lastUsedAt).fromNow()}` : ' · nunca usada'}
                    </Typography>
                  </Box>
                  <Chip size="small" label={status} color={status === 'Ativa' ? 'success' : 'default'} variant="outlined" />
                  {status === 'Ativa' && (t.mine || isAdmin) && (
                    <ConfirmButton iconOnly label="Revogar" title={`Revogar a chave "${t.name}"?`} description="O Claude que usa esta chave perde o acesso na hora." onConfirm={() => revokeApiToken(t.id)} />
                  )}
                </Box>
              );
            })}
            {active.length > 0 && <Typography variant="caption" color="text.secondary">{active.length} chave(s) ativa(s)</Typography>}

            <Typography variant="overline" color="primary.main" sx={{ display: 'block', mt: 3 }}>Registro de uso {isAdmin ? '(equipe)' : '(seu)'}</Typography>
            {logs.length === 0 && <Typography variant="body2" color="text.secondary" mt={1}>Nenhum uso registrado ainda.</Typography>}
            {logs.map((l) => (
              <Box key={l.id} sx={{ display: 'flex', gap: 1.5, py: 0.75, borderTop: 1, borderColor: 'divider', fontSize: 13 }}>
                <Typography fontSize={12.5} color="text.secondary" sx={{ width: 92, flexShrink: 0 }}>{dayjs(l.at).format('DD/MM HH:mm')}</Typography>
                <Typography fontSize={13} sx={{ flex: 1, minWidth: 0 }} noWrap>
                  {isAdmin && l.user ? <b>{l.user} · </b> : null}{l.tool}{l.summary ? ` — ${l.summary}` : ''}
                </Typography>
                {l.personalData && <Tooltip title="A resposta incluiu dados pessoais de terceiros"><Chip size="small" label="dado pessoal" variant="outlined" color="warning" /></Tooltip>}
                {!l.ok && <Chip size="small" label="erro" color="error" variant="outlined" />}
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Card>
  );
}
