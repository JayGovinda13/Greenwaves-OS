import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { canAccessArtist, requireContext } from '@/lib/tenant';
import { dayjs } from '@/lib/format';
import { geocodeCity } from '@/lib/geo';
import {
  hasVenueRider, lines, parseProduction, TRAVEL_DIRECTION_LABEL, TRAVEL_MODE_LABEL, TRAVEL_WINDOW_AFTER, TRAVEL_WINDOW_BEFORE,
  VENUE_RIDER_FIELDS, type Production,
} from '@/lib/production';
import { defaultProduction } from '@/lib/productionDefaults';
import { Logo } from '@/components/brand/Logo';
import { PrintToolbar } from '@/components/print/PrintToolbar';
import { WeatherCard } from '@/components/production/WeatherCard';

export const metadata = { title: 'Ficha técnica' };

const WEEKDAY = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const dm = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;
const weekday = (iso: string) => WEEKDAY[new Date(`${iso}T12:00:00Z`).getUTCDay()]!;
const mapsLink = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
const joinPt = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} e ${xs[xs.length - 1]}`);

function Band({ kicker, title, sub, right, big }: { kicker: string; title: string; sub?: string; right?: string; big?: boolean }) {
  return (
    <div className="gw-band">
      <div className="gw-band-top">
        <Logo color="#FFF7EA" size={0.7} />
        <span>{kicker}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <span className="gw-display" style={{ fontSize: big ? 34 : 28 }}>{title}</span>
          {sub && <span style={{ color: '#C9E13E', fontWeight: 800, fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase' }}>{sub}</span>}
        </div>
        {right && <span style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', opacity: 0.85 }}>{right}</span>}
      </div>
    </div>
  );
}

function Foot({ producer, instagram, page, total }: { producer: string; instagram: string | null; page: number; total: number }) {
  return (
    <div className="gw-foot">
      <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Logo color="#FFF7EA" size={0.55} /> {producer}</span>
      <span>{instagram ? `instagram.com/${instagram.replace(/^@/, '')}` : ''} <b style={{ color: '#C9E13E', marginLeft: 10 }}>{page}/{total}</b></span>
    </div>
  );
}

function Bullets({ text }: { text: string }) {
  const items = lines(text);
  return items.length ? <ul>{items.map((l, i) => <li key={i}>{l}</li>)}</ul> : <div style={{ fontSize: 11.5, opacity: 0.6, marginTop: 4 }}>—</div>;
}

export default async function ProductionSheetPage({ searchParams }: { searchParams: Promise<{ shows?: string }> }) {
  const { shows: param } = await searchParams;
  const ctx = await requireContext();
  const ids = (param ?? '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 12);
  if (!ids.length) notFound();

  const found = await prisma.show.findMany({
    where: { id: { in: ids }, organizationId: ctx.org.id, status: { not: 'CANCELED' } },
    include: {
      artist: { select: { id: true, name: true, coverImageUrl: true } },
      contact: { select: { name: true, phone: true } },
      owner: { select: { name: true, phone: true } },
    },
    orderBy: { date: 'asc' },
  });
  if (!found.length) notFound();
  // um documento = um artista
  const artist = found[0]!.artist;
  const shows = found.filter((s) => s.artistId === artist.id);
  if (!canAccessArtist(ctx, artist.id)) notFound();

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: ctx.org.id },
    select: { name: true, instagram: true, phone: true, memberships: { where: { role: 'OWNER' }, select: { user: { select: { name: true, phone: true } } } } },
  });
  const first = shows[0]!;
  const last = shows[shows.length - 1]!;
  const day = (d: Date) => d.toISOString().slice(0, 10);
  const shift = (d: Date, n: number) => day(new Date(d.getTime() + n * 86400000));
  const legs = await prisma.travelLeg.findMany({
    where: { organizationId: ctx.org.id, artistId: artist.id, date: { gte: shift(first.date, -TRAVEL_WINDOW_BEFORE), lte: shift(last.date, TRAVEL_WINDOW_AFTER) } },
    orderBy: [{ date: 'asc' }, { departure: 'asc' }],
  });
  const productions: Production[] = await Promise.all(shows.map(async (s) => parseProduction(s.production) ?? (await defaultProduction(s.id))));

  const producerUser = first.owner?.phone ? first.owner : org.memberships.find((m) => m.user.phone)?.user ?? first.owner;
  const producer = ['Produção', producerUser?.name ?? org.name, producerUser?.phone ?? org.phone].filter(Boolean).join(' · ');

  // equipe: união das equipes dos shows
  const team = productions.flatMap((p) => p.team).filter((m, i, all) => m.name && all.findIndex((x) => x.name === m.name && x.role === m.role) === i);

  // Páginas
  type PageDef = { kind: 'cover' } | { kind: 'logistics' } | { kind: 'show'; i: number } | { kind: 'rider'; i: number };
  const pages: PageDef[] = [{ kind: 'cover' }];
  if (legs.length) pages.push({ kind: 'logistics' });
  shows.forEach((_, i) => {
    pages.push({ kind: 'show', i });
    if (hasVenueRider(productions[i]!)) pages.push({ kind: 'rider', i });
  });
  const total = pages.length;
  const pageOfShow = (i: number) => pages.findIndex((p) => p.kind === 'show' && p.i === i) + 1;

  const cities = [...new Set(shows.map((s) => s.city ?? s.venue ?? ''))].filter(Boolean);
  const range = shows.length > 1
    ? `${first.date.toISOString().slice(8, 10)}${first.date.getUTCMonth() !== last.date.getUTCMonth() ? `.${first.date.toISOString().slice(5, 7)}` : ''} – ${dayjs.utc(last.date).format('DD.MM.YYYY')}`
    : dayjs.utc(first.date).format('DD.MM.YYYY');
  const kicker = `Ficha técnica · ${shows.length} show${shows.length > 1 ? 's' : ''}`;
  const legsByGroup = legs.reduce<Record<string, typeof legs>>((acc, l) => {
    const key = `${l.mode}|${l.passengers ?? ''}|${l.direction}`;
    (acc[key] ??= []).push(l);
    return acc;
  }, {});

  return (
    <>
      <PrintToolbar backHref={ctx.role === 'ARTIST' ? '/banda' : `/shows/${first.id}`} />
      {pages.map((pg, n) => {
        const pageNo = n + 1;
        if (pg.kind === 'cover') {
          return (
            <div key="cover" className="gw-page">
              <div
                style={{
                  position: 'relative', color: '#FFF7EA', padding: '9mm 12mm 7mm', minHeight: '92mm', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  background: artist.coverImageUrl
                    ? `linear-gradient(180deg, rgba(10,42,31,.35) 0%, rgba(10,42,31,.55) 55%, rgba(10,42,31,.95) 100%), url("${artist.coverImageUrl}") center/cover`
                    : 'radial-gradient(120% 140% at 90% 0%, #2F7A5B 0%, #1C5A44 40%, #0F3B2C 75%, #0A2A1F 100%)',
                }}
              >
                <div className="gw-band-top"><Logo color="#FFF7EA" size={0.75} /><span>{kicker}</span></div>
                <div className="gw-display" style={{ fontSize: artist.name.length > 14 ? 44 : 60, lineHeight: 0.92, marginTop: 18, maxWidth: '75%' }}>{artist.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,247,234,.35)', paddingTop: 6, marginTop: 14, fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase' }}>
                  <span>{joinPt(cities)}</span>
                  <b style={{ color: '#C9E13E' }}>{range}</b>
                </div>
              </div>
              <div className="gw-body">
                <div className="gw-h">Roteiro</div>
                {shows.map((s, i) => (
                  <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '24mm 1fr auto auto', gap: 12, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #E6E0D2' }}>
                    <div>
                      <div className="gw-display" style={{ fontSize: 22, color: '#1C5A44' }}>{dm(day(s.date))}</div>
                      <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#2E8B57', fontWeight: 800 }}>{weekday(day(s.date))}</div>
                    </div>
                    <div>
                      <div className="gw-display" style={{ fontSize: 15 }}>{s.city ?? s.venue}</div>
                      <div style={{ fontSize: 11.5, color: '#444' }}>{[s.venue, s.venueAddress].filter(Boolean).join(' · ')}</div>
                    </div>
                    <div style={{ background: '#0F3B2C', color: '#FFF7EA', borderRadius: 8, padding: '4px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 8.5, letterSpacing: '.14em', color: '#C9E13E', fontWeight: 800 }}>SHOW</div>
                      <div className="gw-display" style={{ fontSize: 17 }}>{productions[i]!.showtime || '—'}</div>
                    </div>
                    <a href={`#show-${s.id}`} className="gw-pill">P. {pageOfShow(i)} →</a>
                  </div>
                ))}

                {team.length > 0 && (
                  <>
                    <div className="gw-h">Equipe</div>
                    <table className="gw-table">
                      <thead><tr><th>Função</th><th>Nome</th><th>Telefone</th></tr></thead>
                      <tbody>{team.map((m, i) => <tr key={i}><td><b>{m.role}</b></td><td>{m.name}</td><td>{m.phone ? <a href={`tel:${m.phone.replace(/\D/g, '')}`} style={{ color: 'inherit' }}>{m.phone}</a> : '—'}</td></tr>)}</tbody>
                    </table>
                  </>
                )}

                <div className="gw-h">Previsão do tempo</div>
                {shows.map((s) => {
                  const g = geocodeCity(s.city, s.state);
                  return <WeatherCard key={s.id} lat={g?.lat ?? null} lng={g?.lng ?? null} date={day(s.date)} label={`${dm(day(s.date))} · ${weekday(day(s.date))} · ${s.city ?? ''}`} />;
                })}
              </div>
              <Foot producer={producer} instagram={org.instagram} page={pageNo} total={total} />
            </div>
          );
        }

        if (pg.kind === 'logistics') {
          const modes = [...new Set(legs.map((l) => TRAVEL_MODE_LABEL[l.mode as keyof typeof TRAVEL_MODE_LABEL] ?? l.mode))];
          const tickets = legs.flatMap((l) => (Array.isArray(l.tickets) ? (l.tickets as { label: string; url: string }[]) : []));
          return (
            <div key="logistics" className="gw-page">
              <Band kicker={`Ficha técnica · ${artist.name}`} title="Logística" sub={modes.join(' · ')} />
              <div className="gw-body">
                <div className="gw-h">Deslocamentos</div>
                {Object.entries(legsByGroup).map(([key, group]) => {
                  const l0 = group[0]!;
                  return (
                    <div key={key} style={{ border: '1.5px solid #0F3B2C', borderRadius: 10, overflow: 'hidden', marginBottom: 12, breakInside: 'avoid' }}>
                      <div style={{ background: '#0F3B2C', color: '#FFF7EA', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ background: '#C9E13E', color: '#17201C', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>
                          {TRAVEL_MODE_LABEL[l0.mode as keyof typeof TRAVEL_MODE_LABEL] ?? l0.mode}
                        </span>
                        <b style={{ textTransform: 'uppercase', fontSize: 12.5, letterSpacing: '.02em' }}>
                          {[l0.passengers, TRAVEL_DIRECTION_LABEL[l0.direction as keyof typeof TRAVEL_DIRECTION_LABEL]].filter(Boolean).join(' - ')}
                        </b>
                      </div>
                      <table className="gw-table" style={{ margin: 0 }}>
                        <thead><tr><th>Cia</th><th>{l0.mode === 'FLIGHT' ? 'Voo' : 'Linha'}</th><th>Trecho</th><th>Data</th><th>Saída</th><th>Chegada</th><th>Embarque</th></tr></thead>
                        <tbody>
                          {group.map((l) => (
                            <tr key={l.id}>
                              <td><b>{l.company ?? '—'}</b></td><td>{l.code ?? '—'}</td>
                              <td><b className="gw-display" style={{ fontSize: 12 }}>{l.origin} → {l.destination}</b>{l.notes && <div className="gw-muted" style={{ fontSize: 10 }}>{l.notes}</div>}</td>
                              <td>{l.date.slice(8, 10)}/{l.date.slice(5, 7)}</td><td>{l.departure ?? '—'}</td><td>{l.arrival ?? '—'}</td><td><b>{l.boarding ?? '—'}</b></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
                {tickets.length > 0 && (
                  <>
                    <div className="gw-h">Bilhetes</div>
                    {tickets.map((t, i) => <a key={i} className="gw-pill" href={t.url} target="_blank" rel="noreferrer">{t.label} ↗</a>)}
                  </>
                )}
              </div>
              <Foot producer={producer} instagram={org.instagram} page={pageNo} total={total} />
            </div>
          );
        }

        const s = shows[pg.i]!;
        const p = productions[pg.i]!;
        const iso = day(s.date);
        const showOf = `Show ${pg.i + 1} de ${shows.length}`;
        const venueQ = [s.venue, s.venueAddress, s.city, s.state].filter(Boolean).join(', ');

        if (pg.kind === 'rider') {
          const som = VENUE_RIDER_FIELDS.filter((f) => f.group === 'som');
          const backline = VENUE_RIDER_FIELDS.filter((f) => f.group === 'backline' && (f.key !== 'other' || p.venueRider.other.trim()));
          return (
            <div key={`rider-${s.id}`} className="gw-page">
              <Band kicker={`Ficha técnica · ${artist.name}`} title="Rider técnico" sub={`${dm(iso)} · ${weekday(iso)} · ${s.city ?? ''}`} right={showOf} />
              <div className="gw-body">
                <div className="gw-h">Sistema de som</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {som.filter((f) => f.key !== 'mics').map((f) => (
                      <div key={f.key} className="gw-card"><b className="gw-display" style={{ fontSize: 12 }}>{f.label}</b><Bullets text={p.venueRider[f.key]} /></div>
                    ))}
                  </div>
                  <div className="gw-card dark"><b className="gw-display" style={{ fontSize: 12, color: '#C9E13E' }}>Microfones e DIs</b><Bullets text={p.venueRider.mics} /></div>
                </div>
                <div className="gw-h">Backline</div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${backline.length}, 1fr)`, gap: 10 }}>
                  {backline.map((f) => (
                    <div key={f.key} className="gw-card"><b className="gw-display" style={{ fontSize: 12 }}>{f.label}</b><Bullets text={p.venueRider[f.key]} /></div>
                  ))}
                </div>
                {p.venueRider.notes.trim() && (
                  <>
                    <div className="gw-h">Observações técnicas</div>
                    <div style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{p.venueRider.notes}</div>
                  </>
                )}
              </div>
              <Foot producer={producer} instagram={org.instagram} page={pageNo} total={total} />
            </div>
          );
        }

        return (
          <div key={`show-${s.id}`} id={`show-${s.id}`} className="gw-page">
            <Band kicker={`Ficha técnica · ${artist.name}`} title={`${dm(iso)} · ${weekday(iso)}`} sub={s.city ?? ''} right={showOf} big />
            <div className="gw-body">
              <div className="gw-keytimes" style={{ marginTop: 4 }}>
                <div><div className="k">Passagem de som</div><b className="gw-display" style={{ fontSize: 16 }}>{p.soundcheck || '—'}</b></div>
                <div><div className="k">Abertura da casa</div><b className="gw-display" style={{ fontSize: 16 }}>{p.doors || '—'}</b></div>
                <div className="hl"><div className="k">Show</div><b className="gw-display" style={{ fontSize: 16 }}>{p.showtime || '—'}</b></div>
                <div><div className="k">Cortesias</div><b className="gw-display" style={{ fontSize: 16 }}>{p.courtesies || '—'}</b></div>
              </div>

              <div className="gw-h">Evento</div>
              <div className="gw-kv"><span className="k">Local</span><span><b>{s.venue ?? 'A definir'}</b> {venueQ && <a className="gw-pill" style={{ marginLeft: 8, padding: '0 8px' }} href={s.venueUrl ?? mapsLink(venueQ)} target="_blank" rel="noreferrer">Mapa ↗</a>}</span></div>
              {(s.venueAddress || s.city) && <div className="gw-kv"><span className="k">Endereço</span><span>{[s.venueAddress, s.city, s.state].filter(Boolean).join(', ')}</span></div>}
              <div className="gw-kv"><span className="k">Data</span><span>{dayjs.utc(s.date).format('D [de] MMMM [de] YYYY')} · {weekday(iso)}</span></div>
              {p.responsible && <div className="gw-kv"><span className="k">Responsável</span><span><b>{p.responsible}</b></span></div>}
              {p.promoter && <div className="gw-kv"><span className="k">Contratante</span><span><b>{p.promoter}</b></span></div>}
              {s.venueTechContact && <div className="gw-kv"><span className="k">Técnico da casa</span><span><b>{s.venueTechContact}</b></span></div>}

              {p.rundown.length > 0 && (
                <>
                  <div className="gw-h">Cronograma</div>
                  {p.rundown.map((r, i) => (
                    <div key={i} className={`gw-run${r.ours ? ' ours' : ''}`}>
                      <b className="gw-display" style={{ fontSize: 13, textAlign: 'center' }}>{r.end ? `${r.start} – ${r.end}` : r.start}</b>
                      <span>{r.label}</span>
                    </div>
                  ))}
                </>
              )}

              {p.notes.trim() && (
                <>
                  <div className="gw-h">Observações</div>
                  <div style={{ fontSize: 12, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{p.notes}</div>
                </>
              )}
            </div>
            <Foot producer={producer} instagram={org.instagram} page={pageNo} total={total} />
          </div>
        );
      })}
    </>
  );
}
