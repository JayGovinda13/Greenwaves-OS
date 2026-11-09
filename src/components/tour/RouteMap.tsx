'use client';
import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

export interface MapPoint {
  lat: number;
  lng: number;
  label: string;
  kind: 'origin' | 'show';
  n?: number; // número da parada
}

export interface RouteResult {
  ok: boolean;
  legs: { km: number; minutes: number }[];
}

const FOREST = '#1C5A44';
const LIME = '#C9E13E';

/**
 * Mapa da rota: marcadores numerados e trajeto rodoviário (OSRM, calculado no navegador).
 * Sem acesso ao roteador, desenha linhas retas tracejadas e o sistema usa as estimativas.
 */
export function RouteMap({ points, height = 320, onRoute }: { points: MapPoint[]; height?: number; onRoute?: (r: RouteResult) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'road' | 'straight'>('loading');

  useEffect(() => {
    let disposed = false;
    let map: import('leaflet').Map | null = null;
    (async () => {
      const L = (await import('leaflet')).default;
      if (disposed || !ref.current || points.length === 0) return;
      map = L.map(ref.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false, zoomSnap: 0.25 });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '© OpenStreetMap',
        crossOrigin: true,
      }).addTo(map);

      const latlngs = points.map((p) => L.latLng(p.lat, p.lng));
      points.forEach((p) => {
        const html =
          p.kind === 'origin'
            ? `<div style="width:26px;height:26px;border-radius:8px;background:${FOREST};border:3px solid ${LIME};box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>`
            : `<div style="width:28px;height:28px;border-radius:50%;background:${LIME};color:#17201C;border:3px solid ${FOREST};display:grid;place-items:center;font:800 13px/1 system-ui;box-shadow:0 2px 6px rgba(0,0,0,.35)">${p.n ?? ''}</div>`;
        // shows sempre por cima da base (ex.: show na própria cidade-base)
        L.marker([p.lat, p.lng], { icon: L.divIcon({ html, className: '', iconSize: [28, 28], iconAnchor: [14, 14] }), zIndexOffset: p.kind === 'show' ? 1000 + (p.n ?? 0) : 0 })
          .addTo(map!)
          .bindTooltip(p.label, { direction: 'top', offset: [0, -14] });
      });
      if (latlngs.length === 1) map.setView(latlngs[0]!, 11);
      else map.fitBounds(L.latLngBounds(latlngs), { padding: [36, 36] });

      // Rota rodoviária (OSRM). Pontos repetidos seguidos são removidos.
      const coords = points.filter((p, i) => i === 0 || p.lat !== points[i - 1]!.lat || p.lng !== points[i - 1]!.lng);
      if (coords.length < 2) {
        setStatus('road');
        onRoute?.({ ok: false, legs: [] });
        return;
      }
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${coords.map((p) => `${p.lng},${p.lat}`).join(';')}?overview=full&geometries=geojson`;
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        const res = await fetch(url, { signal: ctrl.signal });
        clearTimeout(timer);
        const json = await res.json();
        if (disposed) return;
        if (json.code !== 'Ok') throw new Error(json.code);
        const line = (json.routes[0].geometry.coordinates as [number, number][]).map(([lng, lat]) => L.latLng(lat, lng));
        L.polyline(line, { color: FOREST, weight: 5, opacity: 0.85 }).addTo(map);
        setStatus('road');
        onRoute?.({ ok: true, legs: json.routes[0].legs.map((l: { distance: number; duration: number }) => ({ km: Math.round(l.distance / 1000), minutes: Math.round(l.duration / 60) })) });
      } catch {
        if (disposed) return;
        L.polyline(latlngs, { color: FOREST, weight: 3, opacity: 0.8, dashArray: '8 8' }).addTo(map);
        setStatus('straight');
        onRoute?.({ ok: false, legs: [] });
      }
    })();
    return () => {
      disposed = true;
      map?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points)]);

  if (points.length === 0) {
    return (
      <div style={{ height, display: 'grid', placeItems: 'center', background: '#F3EDE0', borderRadius: 12, color: '#555', fontSize: 14 }}>
        Cidades não encontradas para montar o mapa.
      </div>
    );
  }
  return (
    <div>
      <div ref={ref} style={{ height, borderRadius: 12, overflow: 'hidden', background: '#E8E4D8' }} />
      <div style={{ fontSize: 11, color: '#6b6b6b', marginTop: 4 }}>
        {status === 'loading' && 'Calculando rota…'}
        {status === 'road' && 'Rota rodoviária: OSRM / OpenStreetMap.'}
        {status === 'straight' && 'Rota rodoviária indisponível no momento: linhas retas e distâncias estimadas (≈).'}
      </div>
    </div>
  );
}
