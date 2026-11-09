import Link from 'next/link';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { Calendar, Coins, MapPin, Microphone } from 'iconoir-react';
import { prisma } from '@/lib/db';
import { requireContext } from '@/lib/tenant';
import { checklistProgress } from '@/lib/queries';
import { REGION_BY_STATE, SHOW_CHECKLIST, TICKETS_STALE_DAYS } from '@/lib/domain';
import { receivableState } from '@/lib/receivables';
import { dayjs, money } from '@/lib/format';
import { artistColor } from '@/lib/colors';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { ShowStatusChip } from '@/components/ui/StatusChip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ShowsPerMonthChart, RegionChart } from '@/components/dashboard/Charts';
import { BRAND, FOREST_GRADIENT } from '@/theme/brand';

export const metadata = { title: 'Painel' };

export default async function DashboardPage() {
  const ctx = await requireContext();
  const now = new Date();
  const today = dayjs.utc(dayjs().format('YYYY-MM-DD'));
  const year = now.getUTCFullYear();

  const [shows, activity, receivables] = await Promise.all([
    prisma.show.findMany({
      where: { organizationId: ctx.org.id, status: { not: 'CANCELED' } },
      include: { artist: { select: { name: true, slug: true } } },
      orderBy: { date: 'asc' },
    }),
    prisma.activity.findMany({
      where: { organizationId: ctx.org.id },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.transaction.findMany({
      where: { organizationId: ctx.org.id, type: 'INCOME', status: 'PENDING' },
      include: { show: { select: { id: true, city: true } }, artist: { select: { name: true } } },
      orderBy: [{ dueDate: 'asc' }, { date: 'asc' }],
    }),
  ]);
  const inAWeek = today.add(7, 'day');
  const overdueRx = receivables.filter((t) => receivableState(t) === 'OVERDUE');
  const dueSoonRx = receivables.filter((t) => receivableState(t) === 'PENDING' && !dayjs.utc(t.dueDate ?? t.date).isAfter(inAWeek, 'day'));
  const overdueTotal = overdueRx.reduce((sum, t) => sum + t.amount, 0);

  const inYear = shows.filter((s) => s.date.getUTCFullYear() === year);
  const upcoming = shows.filter((s) => !dayjs.utc(s.date).isBefore(today, 'day'));
  const next30 = upcoming.filter((s) => dayjs.utc(s.date).diff(today, 'day') <= 30);
  const feesUpcoming = upcoming.reduce((sum, s) => sum + (s.fee ?? 0), 0);
  const tickets = inYear.reduce((sum, s) => sum + (s.ticketsSold ?? 0), 0);
  const cities = new Set(inYear.map((s) => `${s.city}-${s.state}`)).size;
  const states = new Set(inYear.map((s) => s.state).filter(Boolean)).size;

  const perMonth = Array.from({ length: 12 }, (_, m) => ({
    month: dayjs.utc(`${year}-01-01`).add(m, 'month').format('MMM'),
    shows: inYear.filter((s) => s.date.getUTCMonth() === m).length,
  }));
  const regions = ['Sudeste', 'Sul', 'Nordeste', 'Centro-Oeste', 'Norte'].map((r) => ({
    label: r,
    value: inYear.filter((s) => s.state && REGION_BY_STATE[s.state] === r).length,
  }));
  const artistCounts = Object.values(
    inYear.reduce<Record<string, { name: string; slug: string; n: number }>>((acc, s) => {
      acc[s.artistId] ??= { name: s.artist.name, slug: s.artist.slug, n: 0 };
      acc[s.artistId]!.n++;
      return acc;
    }, {}),
  ).sort((a, b) => b.n - a.n);
  const maxArtist = artistCounts[0]?.n ?? 1;

  // Pendências: shows nos próximos 21 dias com checklist incompleto
  const pending = upcoming
    .filter((s) => dayjs.utc(s.date).diff(today, 'day') <= 21)
    .map((s) => {
      const missing: string[] = SHOW_CHECKLIST.filter((c) => c.key !== 'chkSettled' && !s[c.key]).map((c) => c.label);
      const salesAge = s.ticketsUpdatedAt ? today.diff(dayjs.utc(s.ticketsUpdatedAt), 'day') : null;
      const sellsTickets = !!s.ticketUrl || s.dealType === 'DOOR' || s.dealType === 'GUARANTEE_OR_DOOR';
      if (sellsTickets && (salesAge === null || salesAge >= TICKETS_STALE_DAYS)) missing.unshift('atualizar vendas');
      return { s, missing };
    })
    .filter((x) => x.missing.length > 0)
    .slice(0, 6);

  const first = ctx.user.name.split(' ')[0];

  return (
    <>
      <PageHeader
        overline={dayjs().format('dddd, DD [de] MMMM')}
        title={`E aí, ${first}!`}
        subtitle={`${next30.length} shows nos próximos 30 dias. Segue aí que no caminho a gente explica.`}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        <StatCard label={`Shows em ${year}`} value={inYear.length} hint={`${cities} cidades · ${states} estados`} icon={<Microphone />} tone="forest" />
        <StatCard label="Próximos 30 dias" value={next30.length} hint={`${upcoming.length} datas confirmadas por vir`} icon={<Calendar />} tone="lime" />
        <StatCard label="Cachês por vir" value={money(feesUpcoming)} hint="fixos e mínimos garantidos" icon={<Coins />} />
        <StatCard label="Ingressos vendidos" value={tickets.toLocaleString('pt-BR')} hint={`em ${year}, onde informado`} icon={<MapPin />} />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.6fr 1fr' }, gap: 3, mb: 3 }}>
        <Card sx={{ p: 3 }}>
          <Typography variant="h5">Shows por mês</Typography>
          <Typography variant="body2" color="text.secondary">Agenda {year} do casting</Typography>
          <ShowsPerMonthChart data={perMonth} currentMonth={now.getUTCMonth()} />
        </Card>
        <Card sx={{ p: 3 }}>
          <Typography variant="h5">Circulação</Typography>
          <Typography variant="body2" color="text.secondary">Shows por região em {year}</Typography>
          <RegionChart data={regions} />
        </Card>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.6fr 1fr' }, gap: 3, mb: 3 }}>
        <Card>
          <Box sx={{ p: 3, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Typography variant="h5">Próximos shows</Typography>
            <Typography component={Link} href="/shows" sx={{ fontWeight: 700, color: 'primary.main', textDecoration: 'none' }}>Agenda completa →</Typography>
          </Box>
          {upcoming.length === 0 ? (
            <EmptyState title="Agenda livre" description="Nenhum show futuro cadastrado." />
          ) : (
            upcoming.slice(0, 8).map((s) => {
              const p = checklistProgress(s);
              const d = dayjs.utc(s.date);
              return (
                <Box
                  key={s.id}
                  component={Link}
                  href={`/shows/${s.id}`}
                  sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 3, py: 1.5, borderTop: 1, borderColor: 'divider', color: 'inherit', textDecoration: 'none', '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <Box sx={{ width: 52, textAlign: 'center', flexShrink: 0, borderRadius: 2.5, py: 0.5, bgcolor: artistColor(s.artist.slug), color: '#fff' }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>{d.format('MMM')}</Typography>
                    <Typography sx={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStretch: '125%', fontSize: 20, lineHeight: 1 }}>{d.format('DD')}</Typography>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={800} noWrap>{s.artist.name}</Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>{[s.venue, s.city, s.state].filter(Boolean).join(' · ')}</Typography>
                  </Box>
                  <Box sx={{ width: 110, display: { xs: 'none', sm: 'block' } }}>
                    <LinearProgress variant="determinate" value={(p.done / p.total) * 100} sx={{ height: 6, borderRadius: 3 }} />
                    <Typography fontSize={11} color="text.secondary">{p.done}/{p.total} produção</Typography>
                  </Box>
                  <ShowStatusChip status={s.status} />
                </Box>
              );
            })
          )}
        </Card>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Card sx={{ p: 3, background: FOREST_GRADIENT, color: BRAND.cream, border: 0 }}>
            <Typography variant="h5" sx={{ color: BRAND.lime }}>Pendências de produção</Typography>
            <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>Shows dos próximos 21 dias com checklist aberto</Typography>
            {pending.length === 0 ? (
              <Typography sx={{ opacity: 0.85 }}>Tudo em dia por aqui. 🤘</Typography>
            ) : (
              pending.map(({ s, missing }) => (
                <Box key={s.id} component={Link} href={`/shows/${s.id}`} sx={{ display: 'block', color: 'inherit', textDecoration: 'none', py: 1.25, borderTop: `1px solid ${BRAND.cream}26` }}>
                  <Typography fontWeight={800}>{dayjs.utc(s.date).format('DD/MM')} · {s.artist.name} <Box component="span" sx={{ fontWeight: 400, opacity: 0.8 }}>— {s.city}</Box></Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>Falta: {missing.slice(0, 4).join(', ')}{missing.length > 4 ? ` +${missing.length - 4}` : ''}</Typography>
                </Box>
              ))
            )}
          </Card>
          <Card sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
              <Typography variant="h5">Recebimentos</Typography>
              <Typography component={Link} href="/financeiro" sx={{ fontWeight: 700, color: 'primary.main', textDecoration: 'none', fontSize: 14 }}>Financeiro →</Typography>
            </Box>
            {overdueRx.length > 0 && (
              <Box component={Link} href="/financeiro?status=OVERDUE" sx={{ display: 'block', textDecoration: 'none', p: 1.5, mb: 1.5, borderRadius: 3, bgcolor: 'error.main', color: '#fff' }}>
                <Typography fontWeight={800}>{money(overdueTotal)} em atraso</Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>{overdueRx.length} recebimento(s) vencido(s) sem pagamento</Typography>
              </Box>
            )}
            {[...overdueRx, ...dueSoonRx].slice(0, 6).map((t) => {
              const late = receivableState(t) === 'OVERDUE';
              return (
                <Box key={t.id} component={Link} href={t.show ? `/shows/${t.show.id}` : '/financeiro'} sx={{ display: 'flex', gap: 1.5, py: 1, borderTop: 1, borderColor: 'divider', color: 'inherit', textDecoration: 'none' }}>
                  <Typography fontSize={13} fontWeight={800} sx={{ width: 48, flexShrink: 0, color: late ? 'error.main' : 'text.secondary' }}>
                    {dayjs.utc(t.dueDate ?? t.date).format('DD/MM')}
                  </Typography>
                  <Typography fontSize={14} noWrap sx={{ flex: 1 }}>{t.artist?.name ?? t.description}{t.show?.city ? ` · ${t.show.city}` : ''}</Typography>
                  <Typography fontSize={14} fontWeight={800}>{money(t.amount)}</Typography>
                </Box>
              );
            })}
            {overdueRx.length + dueSoonRx.length === 0 && (
              <Typography color="text.secondary" fontSize={14}>Nada vencido nem vencendo nos próximos 7 dias.</Typography>
            )}
          </Card>
          <Card sx={{ p: 3 }}>
            <Typography variant="h5" mb={2}>Quem mais roda</Typography>
            {artistCounts.slice(0, 7).map((a) => (
              <Box key={a.slug} sx={{ mb: 1.25 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography fontWeight={700} fontSize={14}>{a.name}</Typography>
                  <Typography fontWeight={800} fontSize={14}>{a.n}</Typography>
                </Box>
                <Box sx={{ height: 8, borderRadius: 4, bgcolor: 'action.hover', overflow: 'hidden' }}>
                  <Box sx={{ height: '100%', width: `${(a.n / maxArtist) * 100}%`, bgcolor: artistColor(a.slug), borderRadius: 4 }} />
                </Box>
              </Box>
            ))}
          </Card>
        </Box>
      </Box>

      <Card sx={{ p: 3 }}>
        <Typography variant="h5" mb={1.5}>Atividade recente</Typography>
        {activity.length === 0 ? (
          <Typography color="text.secondary">Nenhuma atividade registrada ainda.</Typography>
        ) : (
          activity.map((a) => (
            <Box key={a.id} sx={{ display: 'flex', gap: 2, py: 1, borderTop: 1, borderColor: 'divider', fontSize: 14 }}>
              <Typography fontSize={13} color="text.secondary" sx={{ width: 110, flexShrink: 0 }}>{dayjs(a.createdAt).fromNow()}</Typography>
              <Typography fontSize={14}>
                <b>{a.user?.name ?? 'Sistema'}</b> {ACTION_LABEL[a.action] ?? a.action} {ENTITY_LABEL[a.entity] ?? a.entity}: {a.summary}
              </Typography>
            </Box>
          ))
        )}
      </Card>
    </>
  );
}

const ACTION_LABEL: Record<string, string> = { created: 'cadastrou', updated: 'atualizou', deleted: 'excluiu', imported: 'importou', completed: 'concluiu', delegated: 'delegou' };
const ENTITY_LABEL: Record<string, string> = { show: 'o show', artist: 'o artista', contact: 'o contato', transaction: 'o lançamento', member: 'o integrante', workbook: 'a planilha', user: 'o usuário', organization: 'a organização', task: 'a tarefa' };
