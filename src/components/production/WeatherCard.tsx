'use client';
import { useEffect, useState } from 'react';
import { Cloud, CloudSunny, Fog, HeavyRain, Rain, Snow, SunLight, Thunderstorm } from 'iconoir-react';

interface Daily {
  code: number; tmax: number; tmin: number; rain: number | null; hmin: number | null; hmax: number | null; wind: number | null;
}

const WMO: [number[], string, React.ComponentType<{ width?: number; height?: number }>][] = [
  [[0], 'Céu limpo', SunLight],
  [[1, 2], 'Parcialmente nublado', CloudSunny],
  [[3], 'Nublado', Cloud],
  [[45, 48], 'Neblina', Fog],
  [[51, 53, 55, 56, 57], 'Garoa', Rain],
  [[61, 63, 66, 80, 81], 'Chuva', Rain],
  [[65, 67, 82], 'Chuva forte', HeavyRain],
  [[71, 73, 75, 77, 85, 86], 'Neve', Snow],
  [[95, 96, 99], 'Tempestade', Thunderstorm],
];
const describe = (code: number) => WMO.find(([codes]) => codes.includes(code)) ?? WMO[2]!;

/** Previsão do tempo (Open-Meteo, sem chave; consultada no navegador). Disponível até ~16 dias antes. */
export function WeatherCard({ lat, lng, date, label }: { lat: number | null; lng: number | null; date: string; label: string }) {
  const [data, setData] = useState<Daily | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'far' | 'error'>('loading');
  const [fetchedAt] = useState(() => new Date());
  const daysAhead = Math.round((new Date(`${date}T12:00:00Z`).getTime() - Date.now()) / 86400000);

  useEffect(() => {
    if (lat === null || lng === null) { setState('error'); return; }
    if (daysAhead > 15 || daysAhead < -1) { setState('far'); return; }
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&timezone=America%2FSao_Paulo&start_date=${date}&end_date=${date}` +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,relative_humidity_2m_max,relative_humidity_2m_min,wind_speed_10m_max';
    fetch(url)
      .then((r) => r.json())
      .then((j) => {
        const d = j.daily;
        if (!d?.time?.length) throw new Error('sem dados');
        setData({
          code: d.weather_code[0], tmax: Math.round(d.temperature_2m_max[0]), tmin: Math.round(d.temperature_2m_min[0]),
          rain: d.precipitation_probability_max?.[0] ?? null, hmin: d.relative_humidity_2m_min?.[0] ?? null, hmax: d.relative_humidity_2m_max?.[0] ?? null,
          wind: d.wind_speed_10m_max?.[0] !== undefined ? Math.round(d.wind_speed_10m_max[0]) : null,
        });
        setState('ok');
      })
      .catch(() => setState('error'));
  }, [lat, lng, date, daysAhead]);

  const [, text, Icon] = data ? describe(data.code) : [[], '', Cloud];
  return (
    <div className="gw-weather">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ color: '#C9E13E' }}><Icon width={34} height={34} /></span>
        {state === 'ok' && data ? (
          <>
            <span className="gw-display" style={{ fontSize: 40 }}>{data.tmax}<sup style={{ fontSize: 14 }}>°C</sup></span>
            <span style={{ fontSize: 11, lineHeight: 1.5, borderLeft: '1px solid rgba(255,247,234,.3)', paddingLeft: 12 }}>
              {data.rain !== null && data.rain > 0 && <>Chuva: <b style={{ color: '#C9E13E' }}>{data.rain}%</b><br /></>}
              {data.hmin !== null && <>Umidade: <b style={{ color: '#C9E13E' }}>{data.hmin}–{data.hmax}%</b><br /></>}
              {data.wind !== null && <>Vento: <b style={{ color: '#C9E13E' }}>{data.wind} km/h</b></>}
            </span>
          </>
        ) : (
          <span style={{ fontSize: 12, opacity: 0.85 }}>
            {state === 'loading' && 'Consultando previsão…'}
            {state === 'far' && (daysAhead > 15 ? `Previsão disponível a partir de ${new Date(new Date(`${date}T12:00:00Z`).getTime() - 15 * 86400000).toLocaleDateString('pt-BR')}` : 'Data já passou')}
            {state === 'error' && 'Previsão indisponível no momento'}
          </span>
        )}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 9.5, letterSpacing: '.12em', fontWeight: 800, color: '#C9E13E', textTransform: 'uppercase' }}>{label}</div>
        {state === 'ok' && data && (
          <>
            <div className="gw-display" style={{ fontSize: 15, marginTop: 2 }}>{text}</div>
            <div style={{ fontSize: 10.5, opacity: 0.85 }}>Mín. {data.tmin}° · Máx. {data.tmax}°</div>
            <div style={{ fontSize: 9.5, opacity: 0.7 }}>Previsão de {fetchedAt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</div>
          </>
        )}
      </div>
    </div>
  );
}
