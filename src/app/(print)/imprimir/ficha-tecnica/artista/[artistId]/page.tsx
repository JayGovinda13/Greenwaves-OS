import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { canAccessArtist, requireContext } from '@/lib/tenant';
import { parseTechRider } from '@/lib/techRider';
import { PrintToolbar } from '@/components/print/PrintToolbar';
import { TechRiderSheet } from '@/components/techrider/TechRiderSheet';
import { EmptyState } from '@/components/ui/EmptyState';

export const metadata = { title: 'Rider da banda' };

export default async function ArtistTechSheetPage({ params }: { params: Promise<{ artistId: string }> }) {
  const { artistId } = await params;
  const ctx = await requireContext();
  const artist = await prisma.artist.findFirst({ where: { id: artistId, organizationId: ctx.org.id } });
  if (!artist || !canAccessArtist(ctx, artist.id)) notFound();
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: ctx.org.id } });
  const rider = parseTechRider(artist.techRider);
  return (
    <>
      <PrintToolbar backHref={`/artistas/${artistId}?aba=ficha`} />
      {rider ? (
        <TechRiderSheet artistName={artist.name} rider={rider} show={null} production={{ name: org.name, phone: org.phone, email: org.email }} />
      ) : (
        <div className="gw-sheet"><EmptyState title="Sem rider da banda" description="Crie o rider na aba Rider & mapa de palco do artista." /></div>
      )}
    </>
  );
}
