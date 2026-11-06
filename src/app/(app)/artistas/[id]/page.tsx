import Link from 'next/link';
import { notFound } from 'next/navigation';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import { ArrowLeft } from 'iconoir-react';
import { prisma } from '@/lib/db';
import { can, requireContext } from '@/lib/tenant';
import { instagramUrl, money } from '@/lib/format';
import { ResourceLink } from '@/components/ui/ResourceLink';
import { StatCard } from '@/components/ui/StatCard';
import { WaveMark } from '@/components/brand/WaveMark';
import { EditArtistButton } from '@/components/artists/ArtistButtons';
import { accentStyle } from '@/components/artists/accent';
import { nameFontSize } from '@/components/artists/nameSize';
import { ArtistTabs } from '@/components/artists/ArtistTabs';
import { checklistProgress } from '@/lib/queries';

export default async function ArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireContext();
  const artist = await prisma.artist.findFirst({
    where: { id, organizationId: ctx.org.id },
    include: {
      members: { orderBy: { name: 'asc' } },
      shows: { orderBy: { date: 'asc' } },
      transactions: { select: { type: true, amount: true, status: true } },
    },
  });
  if (!artist) notFound();
  const now = new Date();
  const active = artist.shows.filter((s) => s.status !== 'CANCELED');
  const upcoming = active.filter((s) => s.date >= now);
  const fees = active.reduce((sum, s) => sum + (s.fee ?? 0), 0);
  const tickets = active.reduce((sum, s) => sum + (s.ticketsSold ?? 0), 0);
  const cities = new Set(active.map((s) => s.city).filter(Boolean)).size;
  const st = accentStyle(artist.accent);
  const canSeeDocs = can(ctx, 'ADMIN');
  const ig = instagramUrl(artist.instagram);

  return (
    <>
      <Box component={Link} href="/artistas" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, color: 'text.secondary', textDecoration: 'none', fontWeight: 700, mb: 2 }}>
        <ArrowLeft width={18} /> Casting
      </Box>

      {/* Hero no formato dos slides do portfólio */}
      <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: 6, background: st.background, color: st.color, p: { xs: 3, md: 5 }, mb: 3 }}>
        <Box sx={{ position: 'absolute', right: { xs: -40, md: 24 }, bottom: { xs: -40, md: 24 }, opacity: 0.2, color: st.sub }}>
          <WaveMark size={220} strokeWidth={2.4} />
        </Box>
        <Box sx={{ position: 'relative', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1.15fr' }, gap: { xs: 3, md: 6 } }}>
          <Box>
            <Typography variant="h1" sx={{ fontSize: { xs: nameFontSize(artist.name, { lg: '2.6rem', md: '2rem', sm: '1.7rem' }), md: nameFontSize(artist.name, { lg: '4.4rem', md: '3.3rem', sm: '2.7rem' }) } }}>{artist.name}</Typography>
            {artist.instagram && (
              <Typography component={ig ? 'a' : 'span'} href={ig ?? undefined} target="_blank" rel="noreferrer" sx={{ display: 'inline-block', color: 'inherit', fontWeight: 700, fontSize: 20, textDecoration: 'underline', textUnderlineOffset: 4, mt: 1 }}>
                {artist.instagram}
              </Typography>
            )}
            <Typography sx={{ mt: 1.5, opacity: 0.85 }}>
              {[artist.originCity, artist.originState].filter(Boolean).join(' · ')}
              {artist.genres ? ` — ${artist.genres}` : ''}
            </Typography>
            {can(ctx, 'ADMIN') && (
              <Box sx={{ mt: 3 }}>
                <EditArtistButton artist={artist} sx={artist.accent === 'lime' ? { bgcolor: '#17201C', color: '#FFF7EA' } : undefined} />
              </Box>
            )}
          </Box>
          <Box>
            <Typography sx={{ fontSize: { xs: 15, md: 17 }, lineHeight: 1.55 }}>{artist.bio ?? 'Sem release cadastrado.'}</Typography>
            {(artist.latestRelease || artist.label) && (
              <Typography sx={{ mt: 1.5, fontWeight: 700 }}>
                {artist.latestRelease ? `“${artist.latestRelease}”` : ''} {artist.label ? `· ${artist.label}` : ''}
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 4, pt: 2.5, borderTop: '1px solid rgba(127,127,127,.4)' }}>
          <ResourceLink href={artist.mediaKitUrl} label="Mídia kit" icon="doc" />
          <ResourceLink href={artist.riderUrl} label="Rider e mapa de palco" icon="rider" />
          <ResourceLink href={artist.photosUrl} label="Fotos de divulgação" icon="photo" />
          <ResourceLink href={artist.settlementUrl} label="Planilha de fechamento" icon="link" />
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        <StatCard label="Shows na agenda" value={active.length} hint={`${upcoming.length} por vir`} tone="forest" />
        <StatCard label="Cidades" value={cities} hint="circulação no período" />
        <StatCard label="Cachês fechados" value={money(fees)} hint="soma dos valores fixos/mínimos" tone="lime" />
        <StatCard label="Ingressos vendidos" value={tickets.toLocaleString('pt-BR')} hint="nos shows com bilheteria informada" />
      </Box>

      <Card>
        <ArtistTabs
          artistId={artist.id}
          shows={artist.shows.map((s) => ({
            id: s.id, date: s.date.toISOString(), city: s.city, state: s.state, venue: s.venue, status: s.status,
            dealType: s.dealType, fee: s.fee, doorPercent: s.doorPercent, dealNotes: s.dealNotes, progress: checklistProgress(s),
          }))}
          members={artist.members.map((m) => ({
            ...m,
            documentRg: canSeeDocs ? m.documentRg : m.documentRg ? '•••••••' : null,
            documentCpf: canSeeDocs ? m.documentCpf : m.documentCpf ? '•••.•••.•••-••' : null,
          }))}
          canEditMembers={can(ctx, 'PRODUCER')}
          canSeeDocs={canSeeDocs}
          canDelete={can(ctx, 'OWNER')}
        />
      </Card>
    </>
  );
}
