import { redirect } from 'next/navigation';
import { requireContext } from '@/lib/tenant';
import { prisma } from '@/lib/db';
import { BandShell } from '@/components/band/BandShell';

export const metadata = { title: 'Portal da banda' };

export default async function BandLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireContext();
  if (ctx.role !== 'ARTIST' || !ctx.artistId) redirect('/dashboard');
  const artist = await prisma.artist.findUniqueOrThrow({ where: { id: ctx.artistId }, select: { name: true } });
  return <BandShell userName={ctx.user.name} artistName={artist.name} orgName={ctx.org.name}>{children}</BandShell>;
}
