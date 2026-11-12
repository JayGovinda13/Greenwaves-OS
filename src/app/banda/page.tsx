import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { Journal, MapPin, Page } from 'iconoir-react';
import { prisma } from '@/lib/db';
import { requireContext } from '@/lib/tenant';
import { dayjs } from '@/lib/format';
import { SHOW_STATUS_LABEL, type ShowStatus } from '@/lib/domain';
import { parseProduction, TRAVEL_DIRECTION_LABEL, TRAVEL_MODE_LABEL } from '@/lib/production';
import { parseTechRider } from '@/lib/techRider';
import { accentStyle } from '@/components/artists/accent';
import { WaveMark } from '@/components/brand/WaveMark';
import { TechRiderPanel } from '@/components/techrider/TechRiderPanel';
import { BandAccount } from '@/components/band/BandAccount';
import { EmptyState } from '@/components/ui/EmptyState';

const DAY = 86400000;

export default async function BandHome() {
  const ctx = await requireContext();
  const artistId = ctx.artistId!;
  const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
  const [artist, upcoming, past, legs, members] = await Promise.all([
    prisma.artist.findUniqueOrThrow({ where: { id: artistId } }),
    prisma.show.findMany({
      where: { organizationId: ctx.org.id, artistId, status: { not: 'CANCELED' }, date: { gte: today } },
      include: { scheduleItems: true },
      orderBy: { date: 'asc' },
      take: 30,
    }),
    prisma.show.findMany({ where: { organizationId: ctx.org.id, artistId, status: { not: 'CANCELED' }, date: { lt: today } }, orderBy: { date: 'desc' }, take: 8 }),
    prisma.travelLeg.findMany({ where: { organizationId: ctx.org.id, artistId, date: { gte: today.toISOString().slice(0, 10) } }, orderBy: [{ date: 'asc' }, { departure: 'asc' }], take: 20 }),
    prisma.artistMember.findMany({ where: { artistId }, select: { name: true, role: true }, orderBy: { name: 'asc' } }),
  ]);

  // Agrupa shows em sequência (até 4 dias entre eles) para a ficha de turnê
  const tours: (typeof upcoming)[] = [];
  for (const s of upcoming) {
    const cur = tours[tours.length - 1];
    if (cur && s.date.getTime() - cur[cur.length - 1]!.date.getTime() <= 4 * DAY) cur.push(s);
    else tours.push([s]);
  }
  const st = accentStyle(artist.accent);
  const time = (s: (typeof upcoming)[number], kind: string, key: 'soundcheck' | 'doors' | 'showtime') =>
    parseProduction(s.production)?.[key] || s.scheduleItems.find((i) => i.kind === kind)?.time || null;

  return (
    <>
      <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: 6, background: st.background, color: st.color, p: { xs: 3, md: 4 }, mb: 3 }}>
        <Box sx={{ position: 'absolute', right: -30, top: -30, opacity: 0.2, color: st.sub }}><WaveMark size={180} strokeWidth={2.4} /></Box>
        <Typography variant="overline" sx={{ color: st.sub }}>Olá, {ctx.user.name.split(' ')[0]}</Typography>
        <Typography variant="h1" sx={{ fontSize: { xs: '2.4rem', md: '3.6rem' } }}>{artist.name}</Typography>
        <Typography sx={{ mt: 1, opacity: 0.85 }}>
          {upcoming.length ? `${upcoming.length} shows pela frente · próximo em ${dayjs.utc(upcoming[0]!.date).format('DD/MM')} (${upcoming[0]!.city ?? upcoming[0]!.venue})` : 'Nenhum show agendado no momento.'}
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.6fr 1fr' }, gap: 3, alignItems: 'start' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Card>
            <Box sx={{ p: 3, pb: 1 }}>
              <Typography variant="h5">Próximos shows</Typography>
              <Typography variant="body2" color="text.secondary">Horários e documentos de cada data. Em caso de dúvida, fale com a produção.</Typography>
            </Box>
            {upcoming.length === 0 && <EmptyState title="Agenda livre" description="Quando a produção confirmar datas, elas aparecem aqui." />}
            {upcoming.map((s) => {
              const d = dayjs.utc(s.date);
              const keys = [['Som', time(s, 'SOUNDCHECK', 'soundcheck')], ['Casa abre', time(s, 'DOORS', 'doors')], ['Show', time(s, 'SET', 'showtime')]].filter(([, v]) => v);
              return (
                <Box key={s.id} sx={{ display: 'flex', gap: 2, px: 3, py: 2, borderTop: 1, borderColor: 'divider', flexWrap: 'wrap', alignItems: 'center' }}>
                  <Box sx={{ width: 64, textAlign: 'center', borderRadius: 3, py: 0.75, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>{d.format('MMM')}</Typography>
                    <Typography sx={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStretch: '125%', fontSize: 24, lineHeight: 1 }}>{d.format('DD')}</Typography>
                    <Typography sx={{ fontSize: 10, textTransform: 'capitalize' }}>{d.format('ddd')}</Typography>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography fontWeight={800}>{s.city ?? 'Cidade a definir'}{s.state ? ` · ${s.state}` : ''}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><MapPin width={14} /> {[s.venue, s.venueAddress].filter(Boolean).join(' · ') || 'Local a definir'}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.75, mt: 0.75, flexWrap: 'wrap' }}>
                      <Chip size="small" variant="outlined" label={SHOW_STATUS_LABEL[s.status as ShowStatus]} />
                      {keys.map(([l, v]) => <Chip key={l} size="small" color={l === 'Show' ? 'secondary' : 'default'} label={`${l} ${v}`} />)}
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button size="small" variant="contained" startIcon={<Page />} href={`/imprimir/ficha-producao?shows=${s.id}`} target="_blank">Ficha técnica</Button>
                    <Button size="small" variant="outlined" startIcon={<Journal />} href={`/imprimir/roadbook/${s.id}`} target="_blank">Roadbook</Button>
                  </Box>
                </Box>
              );
            })}
          </Card>

          {tours.some((t) => t.length > 1) && (
            <Card sx={{ p: 3 }}>
              <Typography variant="h5" mb={1}>Fichas de turnê</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>Shows em sequência num documento só, com logística e uma página por data.</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {tours.filter((t) => t.length > 1).map((t) => (
                  <Button key={t[0]!.id} variant="contained" color="secondary" startIcon={<Page />} href={`/imprimir/ficha-producao?shows=${t.map((s) => s.id).join(',')}`} target="_blank">
                    {t.length} shows · {dayjs.utc(t[0]!.date).format('DD/MM')}–{dayjs.utc(t[t.length - 1]!.date).format('DD/MM')} · {[...new Set(t.map((s) => s.city))].join(', ')}
                  </Button>
                ))}
              </Box>
            </Card>
          )}

          <Card>
            <Box sx={{ p: 3, pb: 0 }}><Typography variant="h5">Rider & mapa de palco</Typography></Box>
            <TechRiderPanel artistId={artist.id} initial={parseTechRider(artist.techRider)} members={members} canEdit />
          </Card>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h5" mb={1.5}>Deslocamentos</Typography>
            {legs.length === 0 && <Typography color="text.secondary" fontSize={14}>Nenhum deslocamento marcado.</Typography>}
            {legs.map((l) => (
              <Box key={l.id} sx={{ py: 1.25, borderTop: 1, borderColor: 'divider' }}>
                <Typography fontWeight={800}>{l.origin} → {l.destination}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {dayjs(l.date).format('DD/MM')} · {TRAVEL_MODE_LABEL[l.mode as keyof typeof TRAVEL_MODE_LABEL]} {TRAVEL_DIRECTION_LABEL[l.direction as keyof typeof TRAVEL_DIRECTION_LABEL]?.toLowerCase()}
                  {l.boarding ? ` · embarque ${l.boarding}` : ''}{l.departure ? ` · saída ${l.departure}` : ''}{l.company ? ` · ${l.company}` : ''}
                </Typography>
                {Array.isArray(l.tickets) && (l.tickets as { label: string; url: string }[]).map((t) => (
                  <Chip key={t.url} size="small" variant="outlined" component="a" href={t.url} target="_blank" clickable label={`${t.label} ↗`} sx={{ mr: 0.5, mt: 0.5 }} />
                ))}
              </Box>
            ))}
          </Card>

          <Card sx={{ p: 3 }}>
            <Typography variant="h5" mb={1.5}>Formação</Typography>
            {members.length === 0 && <Typography color="text.secondary" fontSize={14}>A produção ainda não cadastrou os integrantes.</Typography>}
            {members.map((m) => (
              <Box key={m.name} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderTop: 1, borderColor: 'divider' }}>
                <Typography fontWeight={700}>{m.name}</Typography><Typography color="text.secondary">{m.role}</Typography>
              </Box>
            ))}
          </Card>

          {past.length > 0 && (
            <Card sx={{ p: 3 }}>
              <Typography variant="h5" mb={1.5}>Últimos shows</Typography>
              {past.map((s) => (
                <Box key={s.id} sx={{ display: 'flex', gap: 1.5, py: 0.75, borderTop: 1, borderColor: 'divider' }}>
                  <Typography fontWeight={800} sx={{ width: 48 }}>{dayjs.utc(s.date).format('DD/MM')}</Typography>
                  <Typography noWrap>{s.city} · {s.venue}</Typography>
                </Box>
              ))}
            </Card>
          )}

          <BandAccount />
        </Box>
      </Box>
    </>
  );
}
