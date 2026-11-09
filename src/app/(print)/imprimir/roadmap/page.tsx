import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireContext } from '@/lib/tenant';
import { dayjs } from '@/lib/format';
import { buildRoadmap } from '@/lib/tour';
import { PrintToolbar } from '@/components/print/PrintToolbar';
import { SheetHeader } from '@/components/print/SheetHeader';
import { RoadmapView } from '@/components/tour/RoadmapView';

export const metadata = { title: 'Roadmap' };

const isDay = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

export default async function RoadmapPage({ searchParams }: { searchParams: Promise<{ artist?: string; from?: string; to?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireContext();
  if (!sp.artist) notFound();
  const artist = await prisma.artist.findFirst({ where: { id: sp.artist, organizationId: ctx.org.id }, select: { id: true } });
  if (!artist) notFound();
  const from = isDay(sp.from) ? sp.from! : dayjs().format('YYYY-MM-DD');
  const to = isDay(sp.to) ? sp.to! : dayjs(from).add(60, 'day').format('YYYY-MM-DD');
  const data = await buildRoadmap(ctx.org.id, artist.id, from, to);
  const cities = new Set(data.rows.map((r) => r.stop.label)).size;
  const span = data.rows.length ? dayjs(data.rows[data.rows.length - 1]!.date).diff(dayjs(data.rows[0]!.date), 'day') + 1 : 0;

  return (
    <>
      <PrintToolbar backHref={`/artistas/${artist.id}`} />
      <div className="gw-sheet">
        <SheetHeader
          kind="ROADMAP DA TURNÊ"
          title={data.artist.name}
          subtitle={`${dayjs(from).format('DD/MM/YYYY')} a ${dayjs(to).format('DD/MM/YYYY')} · saída de ${data.origin.label.replace(' (base)', '')}`}
          right={
            <div style={{ display: 'flex', gap: 14, textAlign: 'right' }}>
              {[
                ['Shows', data.rows.length],
                ['Cidades', cities],
                ['Dias', span],
              ].map(([l, v]) => (
                <div key={l as string}>
                  <div style={{ fontSize: 9.5, letterSpacing: '.12em', fontWeight: 800, color: '#C9E13E', textTransform: 'uppercase' }}>{l}</div>
                  <div className="gw-display" style={{ fontSize: 24 }}>{v}</div>
                </div>
              ))}
            </div>
          }
        />
        <RoadmapView
          origin={data.origin.geo ? { lat: data.origin.geo.lat, lng: data.origin.geo.lng, label: data.origin.label } : null}
          rows={data.rows.map((r) => ({
            id: r.id,
            date: r.date,
            venue: r.venue,
            eventName: r.eventName,
            stop: { label: r.stop.label, lat: r.stop.geo?.lat ?? null, lng: r.stop.geo?.lng ?? null },
            fromOrigin: r.leg.from.kind === 'origin',
            fromLabel: r.leg.from.label,
            estimate: r.leg.estimate,
            departure: r.departure ? { day: r.departure.day, time: r.departure.time, title: r.departure.title } : null,
            checkIn: r.checkIn ? { day: r.checkIn.day, time: r.checkIn.time } : null,
            soundcheck: r.soundcheck?.time ?? null,
            set: r.set?.time ?? null,
            checkOut: r.checkOut ? { day: r.checkOut.day, time: r.checkOut.time } : null,
            lodgingName: r.lodgingName,
            contactName: r.contactName,
            progress: r.progress,
            scheduleDone: r.scheduleDone,
            scheduleTotal: r.scheduleTotal,
          }))}
          returnEstimate={data.returnLeg?.estimate ?? null}
        />
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#888', borderTop: '1px solid #E6E0D2', paddingTop: 6 }}>
          <span>{ctx.org.name} · Greenwaves OS</span>
          <span>Gerado em {dayjs().format('DD/MM/YYYY HH:mm')} · ≈ distâncias e tempos estimados quando não há rota calculada</span>
        </div>
      </div>
    </>
  );
}
