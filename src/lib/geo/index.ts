// Geolocalização offline de cidades brasileiras (sem API externa) e estimativas de deslocamento.
import 'server-only';
import data from './municipios.json';

type Entry = [string, number, number];
const BY_UF = data as unknown as Record<string, Entry[]>;

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const INDEX = new Map<string, { name: string; uf: string; lat: number; lng: number }>();
const BY_NAME = new Map<string, { name: string; uf: string; lat: number; lng: number }[]>();
for (const [uf, list] of Object.entries(BY_UF)) {
  for (const [name, lat, lng] of list) {
    const item = { name, uf, lat, lng };
    INDEX.set(`${norm(name)}|${uf}`, item);
    BY_NAME.set(norm(name), [...(BY_NAME.get(norm(name)) ?? []), item]);
  }
}

export interface GeoPoint {
  city: string;
  uf: string;
  lat: number;
  lng: number;
}

// Grafias comuns que diferem do nome oficial do IBGE
const ALIASES: Record<string, string> = { assu: 'acu', diabema: 'diadema', 'sao luis do maranhao': 'sao luis', 'embu': 'embu das artes' };

/** Encontra a cidade pelo nome (+ UF quando houver). Aceita "João Pessoa - PB" e "Pau dos Ferros/RN". */
export function geocodeCity(city: string | null | undefined, uf?: string | null): GeoPoint | null {
  if (!city) return null;
  let name = city;
  let state = uf?.toUpperCase() ?? null;
  const m = city.match(/^(.*?)\s*[-/]\s*([A-Za-z]{2})$/);
  if (m) {
    name = m[1]!;
    state = state ?? m[2]!.toUpperCase();
  }
  const key = ALIASES[norm(name)] ?? norm(name);
  const hit = state ? INDEX.get(`${key}|${state}`) : null;
  if (hit) return { city: hit.name, uf: hit.uf, lat: hit.lat, lng: hit.lng };
  const candidates = BY_NAME.get(key);
  if (candidates?.length === 1 || (candidates?.length && !state)) {
    const c = candidates[0]!;
    return { city: c.name, uf: c.uf, lat: c.lat, lng: c.lng };
  }
  return null;
}

/** Distância em linha reta (km). */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Estimativa de deslocamento quando não há rota rodoviária calculada:
 * estrada ≈ 1,3 × linha reta a ~70 km/h; acima de 700 km de estrada sugere avião.
 */
export function estimateLeg(a: GeoPoint, b: GeoPoint) {
  const straight = haversineKm(a, b);
  const roadKm = Math.round(straight * 1.3);
  const hours = roadKm / 70;
  return { straightKm: Math.round(straight), roadKm, driveMinutes: Math.round(hours * 60), suggestFlight: roadKm > 700 };
}

export function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h${m ? String(m).padStart(2, '0') : ''}` : `${m} min`;
}
