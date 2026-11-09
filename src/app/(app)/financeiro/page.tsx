import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import { ArrowDownLeft, ArrowUpRight, Coins, Wallet } from 'iconoir-react';
import { prisma } from '@/lib/db';
import { can, requireContext } from '@/lib/tenant';
import { dayjs, fmtDate, money } from '@/lib/format';
import { StatCard } from '@/components/ui/StatCard';
import { receivableState } from '@/lib/receivables';
import { ResourceLink } from '@/components/ui/ResourceLink';
import { FinanceView } from '@/components/finance/FinanceView';
import { MonthlyChart } from '@/components/finance/MonthlyChart';

export const metadata = { title: 'Financeiro' };

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ show?: string; status?: string }> }) {
  const { show: showFilter, status: statusFilter } = await searchParams;
  const ctx = await requireContext();
  const year = new Date().getUTCFullYear();
  const [txs, artists, shows] = await Promise.all([
    prisma.transaction.findMany({
      where: { organizationId: ctx.org.id },
      include: { artist: { select: { name: true } }, show: { select: { city: true, date: true } } },
      orderBy: { date: 'desc' },
    }),
    prisma.artist.findMany({ where: { organizationId: ctx.org.id }, select: { id: true, name: true, settlementUrl: true }, orderBy: { name: 'asc' } }),
    prisma.show.findMany({
      where: { organizationId: ctx.org.id, status: { not: 'CANCELED' } },
      select: { id: true, date: true, city: true, venue: true, artistId: true, artist: { select: { name: true } } },
      orderBy: { date: 'desc' },
    }),
  ]);

  const live = txs.filter((t) => t.status !== 'CANCELED');
  const sum = (f: (t: (typeof txs)[number]) => boolean) => live.filter(f).reduce((s, t) => s + t.amount, 0);
  const received = sum((t) => t.type === 'INCOME' && t.status === 'PAID');
  const receivable = sum((t) => t.type === 'INCOME' && t.status === 'PENDING');
  const expenses = sum((t) => t.type === 'EXPENSE' && t.status === 'PAID');
  const payable = sum((t) => t.type === 'EXPENSE' && t.status === 'PENDING');
  const overdueList = live.filter((t) => t.type === 'INCOME' && receivableState(t) === 'OVERDUE');
  const overdue = overdueList.length;
  const overdueAmount = overdueList.reduce((s, t) => s + t.amount, 0);

  const months = Array.from({ length: 12 }, (_, i) => dayjs.utc(`${year}-01-01`).add(i, 'month'));
  const monthly = months.map((m) => {
    const inMonth = live.filter((t) => dayjs.utc(t.date).isSame(m, 'month'));
    return {
      month: m.format('MMM'),
      income: inMonth.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0) / 100,
      expense: inMonth.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0) / 100,
    };
  });

  return (
    <>
      <FinanceView
        canEdit={can(ctx, 'ADMIN')}
        showFilter={showFilter ?? null}
        initialStatus={statusFilter}
        rows={txs.map((t) => ({
          id: t.id, type: t.type, category: t.category, description: t.description, amount: t.amount,
          date: t.date.toISOString(), dueDate: t.dueDate?.toISOString() ?? null, status: t.status, method: t.method,
          showId: t.showId, artistId: t.artistId, notes: t.notes, artist: t.artist?.name ?? null,
          paidAt: t.paidAt?.toISOString() ?? null, source: t.source,
          showLabel: t.show ? `${t.show.city ?? ''} ${fmtDate(t.show.date, 'DD/MM')}`.trim() : null,
        }))}
        artists={artists.map(({ id, name }) => ({ id, name }))}
        shows={shows.map((s) => ({ id: s.id, artistId: s.artistId, label: `${fmtDate(s.date, 'DD/MM/YY')} · ${s.artist.name} · ${s.city ?? s.venue ?? ''}` }))}
        header={
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
              <StatCard label="Recebido" value={money(received)} icon={<ArrowDownLeft />} tone="forest" hint="receitas pagas" />
              <StatCard label="A receber" value={money(receivable)} icon={<Coins />} tone="lime" hint={overdue ? `${money(overdueAmount)} em atraso (${overdue})` : 'nada em atraso'} />
              <StatCard label="Despesas pagas" value={money(expenses)} icon={<ArrowUpRight />} hint={payable ? `${money(payable)} a pagar` : 'nada a pagar'} />
              <StatCard label="Saldo" value={money(received - expenses)} icon={<Wallet />} hint="recebido − despesas pagas" />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3, mb: 3 }}>
              <Card sx={{ p: 3 }}>
                <Typography variant="h5">Fluxo {year}</Typography>
                <Typography variant="body2" color="text.secondary">Receitas e despesas por mês (competência)</Typography>
                <MonthlyChart data={monthly} />
              </Card>
              <Card sx={{ p: 3 }}>
                <Typography variant="h5" mb={0.5}>Fechamentos</Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>Planilhas de acerto por artista</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1.25 }}>
                  {artists.filter((a) => a.settlementUrl).map((a) => (
                    <ResourceLink key={a.id} href={a.settlementUrl} label={a.name} icon="doc" />
                  ))}
                  {artists.every((a) => !a.settlementUrl) && <Typography color="text.secondary">Cadastre o link no perfil do artista.</Typography>}
                </Box>
              </Card>
            </Box>
          </>
        }
      />
    </>
  );
}
