// Lógica de turnê: de onde o artista sai para cada show, trechos, roteiro padrão do dia e roadmap.
import 'server-only';
import { prisma } from './db';
import { estimateLeg, geocodeCity, type GeoPoint } from './geo';
import { checklistProgress } from './queries';
import type { ScheduleKind } from './domain';

/** Até quantos dias entre shows consideramos que o artista segue em turnê (sem voltar para casa). */
const TOUR_GAP_DAYS = 3;

const DAY = 24 * 3600 * 1000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (day: string, n: number) => isoDay(new Date(new Date(`${day}T12:00:00Z`).getTime() + n * DAY));

export interface Stop {
  label: string; // "Florianópolis · SC"
  geo: GeoPoint | null;
  kind: 'origin' | 'show';
}

export interface Leg {
  from: Stop;
  to: Stop;
  estimate: ReturnType<typeof estimateLeg> | null;
}

function showStop(s: { city: string | null; state: string | null; venue: string | null }): Stop {
  const geo = geocodeCity(s.city, s.state);
  return { label: [geo?.city ?? s.city ?? s.venue ?? 'Local a definir', geo?.uf ?? s.state].filter(Boolean).join(' · '), geo, kind: 'show' };
}
function originStop(a: { originCity: string | null; originState: string | null; name: string }): Stop {
  const geo = geocodeCity(a.originCity, a.originState);
  return { label: geo ? `${geo.city} · ${geo.uf} (base)` : `Base de ${a.name}`, geo, kind: 'origin' };
}
function leg(from: Stop, to: Stop): Leg {
  return { from, to, estimate: from.geo && to.geo ? estimateLeg(from.geo, to.geo) : null };
}

/** Trecho até o show: parte do show anterior (se for turnê) ou da cidade-base do artista. */
export async function legToShow(organizationId: string, showId: string) {
  const show = await prisma.show.findFirstOrThrow({
    where: { id: showId, organizationId },
    include: { artist: { select: { name: true, originCity: true, originState: true } } },
  });
  const prev = await prisma.show.findFirst({
    where: {
      organizationId,
      artistId: show.artistId,
      status: { not: 'CANCELED' },
      id: { not: show.id },
      date: { lt: show.date, gte: new Date(show.date.getTime() - TOUR_GAP_DAYS * DAY) },
    },
    orderBy: { date: 'desc' },
  });
  const from = prev ? { ...showStop(prev), label: `${showStop(prev).label} (show de ${isoDay(prev.date).slice(8, 10)}/${isoDay(prev.date).slice(5, 7)})` } : originStop(show.artist);
  return { show, previousShow: prev, leg: leg(from, showStop(show)) };
}

const pad = (n: number) => String(n).padStart(2, '0');
const toTime = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

/** Roteiro padrão do dia (editável depois): considera se o artista viaja e o tempo estimado de estrada. */
export function defaultSchedule(day: string, l: Leg): { kind: ScheduleKind; day: string; time: string; title?: string; location?: string }[] {
  const items: { kind: ScheduleKind; day: string; time: string; title?: string; location?: string }[] = [];
  const travelling = !!l.estimate && l.estimate.roadKm > 60;

  if (travelling && l.estimate) {
    const arrival = 13 * 60;
    if (l.estimate.suggestFlight) {
      items.push({ kind: 'DEPARTURE', day, time: '08:00', title: 'Embarque no aeroporto', location: l.from.label });
      items.push({ kind: 'ARRIVAL', day, time: toTime(arrival), title: 'Chegada / translado', location: l.to.label });
    } else {
      // sai cedo o suficiente para chegar 13h; se for muito longe, sai no dia anterior
      let dep = arrival - Math.ceil(l.estimate.driveMinutes / 30) * 30 - 30;
      let depDay = day;
      if (dep < 5 * 60) {
        depDay = addDays(day, -1);
        dep = Math.max(8 * 60, 24 * 60 + dep);
      }
      items.push({ kind: 'DEPARTURE', day: depDay, time: toTime(dep), title: 'Saída da van', location: l.from.label });
      items.push({ kind: 'ARRIVAL', day, time: toTime(arrival), location: l.to.label });
    }
    items.push({ kind: 'CHECK_IN', day, time: '14:00' });
  } else {
    items.push({ kind: 'LOAD_IN', day, time: '16:00' });
  }
  items.push(
    { kind: 'SOUNDCHECK', day, time: '17:00' },
    { kind: 'MEAL', day, time: '19:00', title: 'Jantar' },
    { kind: 'DOORS', day, time: '20:00' },
    { kind: 'SET', day, time: '22:00' },
    { kind: 'LOAD_OUT', day, time: '23:30' },
  );
  if (travelling) items.push({ kind: 'CHECK_OUT', day: addDays(day, 1), time: '12:00' });
  return items.sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time));
}

export function scheduleSortKey(i: { day: string; time: string }) {
  return `${i.day} ${i.time}`;
}

/** Roadmap de um artista num período: paradas, trechos, horários-chave e situação de produção. */
export async function buildRoadmap(organizationId: string, artistId: string, from: string, to: string) {
  const artist = await prisma.artist.findFirstOrThrow({
    where: { id: artistId, organizationId },
    select: { id: true, name: true, originCity: true, originState: true, instagram: true },
  });
  const shows = await prisma.show.findMany({
    where: {
      organizationId,
      artistId,
      status: { not: 'CANCELED' },
      date: { gte: new Date(`${from}T00:00:00Z`), lte: new Date(`${to}T23:59:59Z`) },
    },
    include: { scheduleItems: true },
    orderBy: { date: 'asc' },
  });

  const origin = originStop(artist);
  let prevStop = origin;
  let prevDate: Date | null = null;
  const rows = shows.map((s) => {
    const stop = showStop(s);
    // Intervalo grande entre shows: considera volta para a base
    const fromStop = prevDate && s.date.getTime() - prevDate.getTime() <= TOUR_GAP_DAYS * DAY ? prevStop : origin;
    const l = leg(fromStop, stop);
    prevStop = stop;
    prevDate = s.date;
    const items = [...s.scheduleItems].sort((a, b) => scheduleSortKey(a).localeCompare(scheduleSortKey(b)));
    const first = (k: ScheduleKind) => items.find((i) => i.kind === k) ?? null;
    return {
      id: s.id,
      date: isoDay(s.date),
      venue: s.venue,
      eventName: s.eventName,
      stop,
      leg: l,
      departure: first('DEPARTURE'),
      checkIn: first('CHECK_IN'),
      soundcheck: first('SOUNDCHECK'),
      set: first('SET'),
      checkOut: first('CHECK_OUT'),
      lodgingName: s.lodgingName,
      contactName: s.contactName,
      status: s.status,
      progress: checklistProgress(s),
      scheduleDone: items.filter((i) => i.done).length,
      scheduleTotal: items.length,
    };
  });
  const lastShow = rows[rows.length - 1];
  const returnLeg = lastShow ? leg(lastShow.stop, origin) : null;
  const totalKm = rows.reduce((sum, r) => sum + (r.leg.estimate?.roadKm ?? 0), 0) + (returnLeg?.estimate?.roadKm ?? 0);
  return { artist, origin, rows, returnLeg, totalKm };
}
