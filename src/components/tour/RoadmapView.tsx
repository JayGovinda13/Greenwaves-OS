'use client';
import { Fragment, useMemo, useState } from 'react';
import { dayjs } from '@/lib/format';
import { RouteMap, type MapPoint, type RouteResult } from './RouteMap';

interface Estimate { roadKm: number; driveMinutes: number; suggestFlight: boolean }
export interface RoadmapRow {
  id: string;
  date: string;
  venue: string | null;
  eventName: string | null;
  stop: { label: string; lat: number | null; lng: number | null };
  fromOrigin: boolean;
  fromLabel: string;
  estimate: Estimate | null;
  departure: { day: string; time: string; title: string | null } | null;
  checkIn: { day: string; time: string } | null;
  soundcheck: string | null;
  set: string | null;
  checkOut: { day: string; time: string } | null;
  lodgingName: string | null;
  contactName: string | null;
  progress: { done: number; total: number };
  scheduleDone: number;
  scheduleTotal: number;
}

const dur = (m: number) => {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h ? `${h}h${mm ? String(mm).padStart(2, '0') : ''}` : `${mm} min`;
};
const when = (x: { day: string; time: string } | null, showDay: string) =>
  x ? `${x.time}${x.day !== showDay ? ` (${dayjs(x.day).format('DD/MM')})` : ''}` : '—';

export function RoadmapView({ origin, rows, returnEstimate }: { origin: { lat: number; lng: number; label: string } | null; rows: RoadmapRow[]; returnEstimate: Estimate | null }) {
  const [route, setRoute] = useState<RouteResult | null>(null);

  // Sequência real da viagem: base → shows (voltando à base em intervalos longos) → base
  const { points, owner } = useMemo(() => {
    const pts: MapPoint[] = [];
    const own: (number | 'return' | null)[] = [];
    if (origin) { pts.push({ ...origin, kind: 'origin' }); own.push(null); }
    rows.forEach((r, i) => {
      if (r.fromOrigin && i > 0 && origin) { pts.push({ ...origin, kind: 'origin' }); own.push(null); }
      if (r.stop.lat !== null && r.stop.lng !== null) { pts.push({ lat: r.stop.lat, lng: r.stop.lng, label: `${i + 1}. ${r.stop.label}`, kind: 'show', n: i + 1 }); own.push(i); }
    });
    if (origin && rows.length) { pts.push({ ...origin, kind: 'origin' }); own.push('return'); }
    return { points: pts, owner: own };
  }, [origin, rows]);

  // Distâncias reais do roteador, atribuídas ao trecho que chega em cada parada
  const real = useMemo(() => {
    const byRow = new Map<number | 'return', { km: number; minutes: number }>();
    if (!route?.ok) return byRow;
    const survived = points.map((_, i) => i).filter((i) => i === 0 || points[i]!.lat !== points[i - 1]!.lat || points[i]!.lng !== points[i - 1]!.lng);
    route.legs.forEach((l, k) => {
      const target = owner[survived[k + 1]!];
      if (target !== null && target !== undefined) byRow.set(target, l);
    });
    return byRow;
  }, [route, points, owner]);

  const legOf = (key: number | 'return', est: Estimate | null, sameCity: boolean) => {
    if (sameCity) return { km: 0, minutes: 0, approx: false };
    const r = real.get(key);
    if (r) return { km: r.km, minutes: r.minutes, approx: false };
    return est ? { km: est.roadKm, minutes: est.driveMinutes, approx: true } : null;
  };

  const legs = rows.map((r, i) => {
    const prev = rows[i - 1];
    const sameCity = !r.fromOrigin && !!prev && prev.stop.label === r.stop.label;
    return legOf(i, r.estimate, sameCity || (r.estimate?.roadKm ?? 1) < 5);
  });
  const back = rows.length ? legOf('return', returnEstimate, (returnEstimate?.roadKm ?? 1) < 5) : null;
  const totalKm = legs.reduce((s, l) => s + (l?.km ?? 0), 0) + (back?.km ?? 0);
  const anyApprox = legs.some((l) => l?.approx) || back?.approx;

  if (rows.length === 0) {
    return <div className="gw-box gw-muted" style={{ marginTop: 14, fontSize: 13 }}>Nenhum show confirmado neste período.</div>;
  }

  return (
    <>
      <div className="gw-section">
        <RouteMap points={points} height={300} onRoute={setRoute} />
        <div style={{ display: 'flex', gap: 16, fontSize: 12, marginTop: 6 }}>
          <span><b>{anyApprox ? '≈ ' : ''}{totalKm.toLocaleString('pt-BR')} km</b> de estrada no total (ida e volta)</span>
          {origin && <span className="gw-muted">■ base ({origin.label.replace(' (base)', '')}) · ● shows numerados</span>}
        </div>
      </div>

      <div className="gw-section">
        <p className="gw-over">Itinerário</p>
        <table className="gw-table">
          <thead>
            <tr>
              <th style={{ width: 22 }}>#</th>
              <th>Data</th>
              <th>Destino</th>
              <th>Trecho</th>
              <th>Embarque</th>
              <th>Check-in</th>
              <th>Som / Show</th>
              <th>Hotel</th>
              <th style={{ width: 70 }}>Produção</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const l = legs[i];
              const gap = i > 0 ? dayjs(r.date).diff(dayjs(rows[i - 1]!.date), 'day') - 1 : 0;
              return (
                <Fragment key={r.id}>
                  {gap > 0 && (
                    <tr>
                      <td colSpan={9} className="gw-muted" style={{ fontSize: 10.5, fontStyle: 'italic', background: '#F6F2E8' }}>
                        {gap} dia(s) livre(s){r.fromOrigin ? ' · retorno à base' : ''}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td><b>{i + 1}</b></td>
                    <td style={{ whiteSpace: 'nowrap' }}><b>{dayjs(r.date).format('DD/MM')}</b><div className="gw-muted" style={{ fontSize: 10, textTransform: 'capitalize' }}>{dayjs(r.date).format('ddd')}</div></td>
                    <td><b>{r.stop.label}</b><div className="gw-muted" style={{ fontSize: 10.5 }}>{[r.eventName, r.venue].filter(Boolean).join(' · ') || '—'}</div></td>
                    <td style={{ fontSize: 10.5 }}>
                      {l ? (l.km === 0 ? 'mesma cidade' : <>{l.approx ? '≈' : ''}{l.km} km · {l.approx ? '≈' : ''}{dur(l.minutes)}{r.estimate?.suggestFlight ? <div style={{ color: '#C2412D', fontWeight: 700 }}>avaliar avião</div> : null}</>) : '—'}
                      <div className="gw-muted" style={{ fontSize: 9.5 }}>de {r.fromLabel.replace(/ \(show de .*\)$/, '')}</div>
                    </td>
                    <td style={{ fontSize: 11 }}>{when(r.departure, r.date)}{r.departure?.title && <div className="gw-muted" style={{ fontSize: 9.5 }}>{r.departure.title}</div>}</td>
                    <td style={{ fontSize: 11 }}>{when(r.checkIn, r.date)}{r.checkOut && <div className="gw-muted" style={{ fontSize: 9.5 }}>out {when(r.checkOut, r.date)}</div>}</td>
                    <td style={{ fontSize: 11 }}>{r.soundcheck ?? '—'} / <b>{r.set ?? '—'}</b></td>
                    <td style={{ fontSize: 11 }}>{r.lodgingName ?? '—'}</td>
                    <td style={{ fontSize: 10.5 }}>
                      <span className="gw-check">{r.progress.done === r.progress.total ? '✓' : ''}</span> {r.progress.done}/{r.progress.total}
                      {r.scheduleTotal > 0 && <div className="gw-muted" style={{ fontSize: 9.5 }}>roteiro {r.scheduleDone}/{r.scheduleTotal}</div>}
                    </td>
                  </tr>
                </Fragment>
              );
            })}
            {back && (
              <tr>
                <td />
                <td colSpan={2}><b>Retorno à base</b></td>
                <td style={{ fontSize: 10.5 }}>{back.km === 0 ? '—' : <>{back.approx ? '≈' : ''}{back.km} km · {back.approx ? '≈' : ''}{dur(back.minutes)}</>}</td>
                <td colSpan={5} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
