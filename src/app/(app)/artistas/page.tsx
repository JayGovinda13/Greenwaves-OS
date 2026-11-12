import Link from 'next/link';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { prisma } from '@/lib/db';
import { can, requireStaff } from '@/lib/tenant';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { WaveMark } from '@/components/brand/WaveMark';
import { NewArtistButton } from '@/components/artists/ArtistButtons';
import { accentStyle } from '@/components/artists/accent';
import { nameFontSize } from '@/components/artists/nameSize';

export const metadata = { title: 'Casting' };

export default async function ArtistsPage() {
  const ctx = await requireStaff();
  const now = new Date();
  const artists = await prisma.artist.findMany({
    where: { organizationId: ctx.org.id },
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
    include: {
      _count: { select: { shows: { where: { status: { not: 'CANCELED' } } }, members: true } },
      shows: { where: { date: { gte: now }, status: { not: 'CANCELED' } }, orderBy: { date: 'asc' }, take: 1, select: { date: true, city: true } },
    },
  });
  const upcoming = await prisma.show.groupBy({
    by: ['artistId'],
    where: { organizationId: ctx.org.id, date: { gte: now }, status: { not: 'CANCELED' } },
    _count: true,
  });
  const upMap = new Map(upcoming.map((u) => [u.artistId, u._count]));

  return (
    <>
      <PageHeader
        overline={`Casting ${now.getFullYear()}`}
        title="Nosso casting"
        subtitle="Do hardcore ao surf punk, do brega psicolésbico ao rock nordestino — artistas autorais de diferentes gerações, estilos e regiões."
        actions={can(ctx, 'ADMIN') ? <NewArtistButton /> : undefined}
      />
      {artists.length === 0 ? (
        <EmptyState title="Nenhum artista ainda" description="Cadastre o primeiro artista do seu casting." />
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' }, gap: 2.5 }}>
          {artists.map((a) => {
            const st = accentStyle(a.accent);
            const next = a.shows[0];
            return (
              <Box
                key={a.id}
                component={Link}
                href={`/artistas/${a.id}`}
                sx={{
                  position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  minHeight: 250, p: 3, borderRadius: 5, textDecoration: 'none', background: st.background, color: st.color,
                  opacity: a.active ? 1 : 0.55, transition: 'transform .18s ease, box-shadow .18s ease',
                  border: a.accent === 'cream' ? 1 : 0, borderColor: 'divider',
                  '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 18px 40px -18px rgba(15,59,44,.55)' },
                }}
              >
                <Box sx={{ position: 'absolute', right: -26, top: -26, opacity: 0.22, color: st.sub }}>
                  <WaveMark size={150} strokeWidth={2.6} />
                </Box>
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', position: 'relative' }}>
                  {(a.genres ?? '').split(',').filter(Boolean).slice(0, 2).map((g) => (
                    <Chip key={g} size="small" label={g.trim()} sx={{ bgcolor: 'rgba(255,255,255,.18)', color: 'inherit', backdropFilter: 'blur(4px)' }} />
                  ))}
                  {!a.active && <Chip size="small" label="Inativo" />}
                </Box>
                <Box sx={{ position: 'relative' }}>
                  <Typography variant="h3" sx={{ fontSize: nameFontSize(a.name, { lg: '2.1rem', md: '1.75rem', sm: '1.45rem' }), hyphens: 'none' }}>{a.name}</Typography>
                  {a.instagram && (
                    <Typography sx={{ fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, mt: 0.75 }}>{a.instagram}</Typography>
                  )}
                  <Typography sx={{ fontSize: 14, opacity: 0.85, mt: 0.25 }}>
                    {[a.originCity, a.originState].filter(Boolean).join(' · ') || 'Origem não informada'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2.5, mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'currentcolor', borderTopColor: 'rgba(127,127,127,.35)' }}>
                    <Stat label="Shows" value={a._count.shows} />
                    <Stat label="Por vir" value={upMap.get(a.id) ?? 0} />
                    <Stat label="Próximo" value={next ? `${next.date.toISOString().slice(8, 10)}/${next.date.toISOString().slice(5, 7)}` : '—'} />
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.75 }}>{label}</Typography>
      <Typography sx={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStretch: '125%', fontSize: 20 }}>{value}</Typography>
    </Box>
  );
}
