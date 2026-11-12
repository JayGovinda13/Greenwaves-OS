import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireContext } from '@/lib/tenant';
import { SCHEDULE_KIND_LABEL, type ScheduleKind } from '@/lib/domain';
import { parseTechRider } from '@/lib/techRider';
import { scheduleSortKey } from '@/lib/tour';
import { PrintToolbar } from '@/components/print/PrintToolbar';
import { TechRiderSheet } from '@/components/techrider/TechRiderSheet';
import { EmptyState } from '@/components/ui/EmptyState';

export const metadata = { title: 'Ficha técnica' };

/** Horários que interessam à casa/técnica. */
const TECH_KINDS: ScheduleKind[] = ['ARRIVAL', 'LOAD_IN', 'SOUNDCHECK', 'DOORS', 'SET', 'LOAD_OUT'];

export default async function ShowTechSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireContext();
  const show = await prisma.show.findFirst({
    where: { id, organizationId: ctx.org.id },
    include: { artist: true, scheduleItems: true, owner: { select: { name: true, phone: true, email: true } } },
  });
  if (!show) notFound();
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: ctx.org.id } });
  const rider = parseTechRider(show.techRider) ?? parseTechRider(show.artist.techRider);
  if (!rider) {
    return (
      <>
        <PrintToolbar backHref={`/shows/${id}`} />
        <div className="gw-sheet"><EmptyState title="Sem ficha técnica" description="Crie o modelo na aba Ficha técnica do artista." /></div>
      </>
    );
  }
  const times = [...show.scheduleItems]
    .filter((i) => TECH_KINDS.includes(i.kind as ScheduleKind))
    .sort((a, b) => scheduleSortKey(a).localeCompare(scheduleSortKey(b)))
    .map((i) => ({ label: SCHEDULE_KIND_LABEL[i.kind as ScheduleKind], time: i.time, day: i.day }));

  return (
    <>
      <PrintToolbar backHref={`/shows/${id}`} />
      <TechRiderSheet
        artistName={show.artist.name}
        rider={rider}
        production={{ name: show.owner?.name ? `${show.owner.name} (${org.name})` : org.name, phone: show.owner?.phone ?? org.phone, email: show.owner?.email ?? org.email }}
        show={{
          date: show.date.toISOString().slice(0, 10),
          venue: show.venue,
          address: show.venueAddress,
          city: show.city,
          state: show.state,
          eventName: show.eventName,
          times,
          venueTechContact: show.venueTechContact,
          techNotes: show.techNotes,
          customized: !!parseTechRider(show.techRider),
        }}
      />
    </>
  );
}
