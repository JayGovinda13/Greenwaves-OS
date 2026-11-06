import { prisma } from '@/lib/db';
import { requireContext, can } from '@/lib/tenant';
import { artistOptions, contactOptions, checklistProgress } from '@/lib/queries';
import { ShowsView, type ShowRow } from '@/components/shows/ShowsView';

export const metadata = { title: 'Agenda de shows' };

export default async function ShowsPage() {
  const ctx = await requireContext();
  const [shows, artists, contacts] = await Promise.all([
    prisma.show.findMany({
      where: { organizationId: ctx.org.id },
      include: { artist: { select: { name: true, slug: true } } },
      orderBy: { date: 'asc' },
    }),
    artistOptions(ctx.org.id),
    contactOptions(ctx.org.id),
  ]);
  const rows: ShowRow[] = shows.map((s) => ({
    id: s.id,
    date: s.date.toISOString(),
    artistId: s.artistId,
    artist: s.artist.name,
    artistSlug: s.artist.slug,
    city: s.city,
    state: s.state,
    venue: s.venue,
    status: s.status,
    dealType: s.dealType,
    fee: s.fee,
    doorPercent: s.doorPercent,
    dealNotes: s.dealNotes,
    ticketsSold: s.ticketsSold,
    progress: checklistProgress(s),
  }));
  return <ShowsView rows={rows} artists={artists} contacts={contacts} canEdit={can(ctx, 'PRODUCER')} />;
}
