import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { can, requireContext } from '@/lib/tenant';
import {
  DEAL_TYPE_LABEL, PAYMENT_TERMS_LABEL, SCHEDULE_KIND_LABEL, SHOW_CHECKLIST, hospitalityLabels,
  type DealType, type PaymentTerms, type ScheduleKind,
} from '@/lib/domain';
import { dayjs, fmtDate, isUrl } from '@/lib/format';
import { fmtDuration } from '@/lib/geo';
import { legToShow, scheduleSortKey } from '@/lib/tour';
import { PrintToolbar } from '@/components/print/PrintToolbar';
import { SheetHeader } from '@/components/print/SheetHeader';
import { RouteMap, type MapPoint } from '@/components/tour/RouteMap';
import { dealLabel } from '@/components/shows/dealLabel';

export const metadata = { title: 'Roadbook' };

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div style={{ fontSize: 12, marginBottom: 4 }}>
      <span className="gw-muted" style={{ fontWeight: 700 }}>{label}: </span>
      {children}
    </div>
  );
}
function Val({ v }: { v: string | null }) {
  if (!v) return null;
  return isUrl(v) ? <a href={v} style={{ color: '#1C5A44', fontWeight: 700 }}>{v.length > 48 ? 'abrir link ↗' : v}</a> : <span style={{ whiteSpace: 'pre-wrap' }}>{v}</span>;
}
const mapsLink = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

export default async function RoadbookPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ valores?: string }> }) {
  const { id } = await params;
  const { valores } = await searchParams;
  const showMoney = valores === '1';
  const ctx = await requireContext();
  // preferências/restrições podem ser dado sensível: só para quem produz (LGPD art. 11)
  const canSeeRestrictions = can(ctx, 'PRODUCER');
  const exists = await prisma.show.findFirst({ where: { id, organizationId: ctx.org.id }, select: { id: true } });
  if (!exists) notFound();

  const [{ leg }, show, org] = await Promise.all([
    legToShow(ctx.org.id, id),
    prisma.show.findUniqueOrThrow({
      where: { id },
      include: {
        artist: { include: { members: { orderBy: { name: 'asc' } } } },
        contact: true,
        owner: { select: { name: true, email: true, phone: true } },
        scheduleItems: true,
      },
    }),
    prisma.organization.findUniqueOrThrow({ where: { id: ctx.org.id } }),
  ]);

  const items = [...show.scheduleItems].sort((a, b) => scheduleSortKey(a).localeCompare(scheduleSortKey(b)));
  const showDay = show.date.toISOString().slice(0, 10);
  const d = dayjs.utc(show.date);
  const hosp = hospitalityLabels(show.hospitality);
  const points: MapPoint[] = [
    ...(leg.from.geo && leg.estimate && leg.estimate.roadKm > 5 ? [{ lat: leg.from.geo.lat, lng: leg.from.geo.lng, label: leg.from.label, kind: leg.from.kind === 'origin' ? 'origin' as const : 'show' as const, n: leg.from.kind === 'origin' ? undefined : 0 }] : []),
    ...(leg.to.geo ? [{ lat: leg.to.geo.lat, lng: leg.to.geo.lng, label: leg.to.label, kind: 'show' as const, n: 1 }] : []),
  ];
  const venueQuery = [show.venue, show.venueAddress, show.city, show.state].filter(Boolean).join(', ');
  const hotelQuery = [show.lodgingName, show.lodgingAddress, show.city, show.state].filter(Boolean).join(', ');

  return (
    <>
      <PrintToolbar
        backHref={`/shows/${id}`}
        toggles={[{ label: 'Incluir valores (cachê e pagamento)', href: `?valores=${showMoney ? '0' : '1'}`, active: showMoney }]}
      />
      <div className="gw-sheet">
        <SheetHeader
          kind="ROADBOOK"
          title={show.artist.name}
          subtitle={[show.eventName, show.venue, [show.city, show.state].filter(Boolean).join(' · ')].filter(Boolean).join(' — ')}
          right={
            <div style={{ background: '#C9E13E', color: '#17201C', borderRadius: 10, padding: '6px 12px', textAlign: 'center', minWidth: 76 }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>{d.format('MMM')}</div>
              <div className="gw-display" style={{ fontSize: 30 }}>{d.format('DD')}</div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'capitalize' }}>{d.format('ddd YYYY')}</div>
            </div>
          }
        />

        <div className="gw-section" style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 12 }}>
          <div>
            <p className="gw-over">Roteiro do dia</p>
            {items.length === 0 ? (
              <div className="gw-box gw-muted" style={{ fontSize: 12 }}>Nenhum horário cadastrado. Monte o roteiro na página do show.</div>
            ) : (
              <table className="gw-table">
                <thead>
                  <tr><th style={{ width: 18 }} /><th style={{ width: 70 }}>Hora</th><th>Etapa</th></tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id}>
                      <td><span className="gw-check">{i.done ? '✓' : ''}</span></td>
                      <td>
                        <b className="gw-display" style={{ fontSize: 13 }}>{i.time}</b>
                        {i.day !== showDay && <div className="gw-muted" style={{ fontSize: 9.5 }}>{dayjs(i.day).format('ddd DD/MM')}</div>}
                      </td>
                      <td>
                        <b>{SCHEDULE_KIND_LABEL[i.kind as ScheduleKind] ?? i.kind}</b>{i.title ? ` · ${i.title}` : ''}
                        {(i.location || i.notes) && <div className="gw-muted" style={{ fontSize: 10.5 }}>{[i.location, i.notes].filter(Boolean).join(' — ')}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div>
            <p className="gw-over">Trajeto</p>
            <RouteMap points={points} height={230} />
            <div className="gw-box" style={{ marginTop: 8, fontSize: 12 }}>
              <div><b>De:</b> {leg.from.label}</div>
              <div><b>Para:</b> {leg.to.label}</div>
              {leg.estimate && leg.estimate.roadKm > 5 ? (
                <div style={{ marginTop: 4 }}>
                  ≈ {leg.estimate.roadKm} km de estrada · ≈ {fmtDuration(leg.estimate.driveMinutes)} dirigindo
                  {leg.estimate.suggestFlight && <b style={{ color: '#C2412D' }}> · trecho longo: avaliar avião</b>}
                </div>
              ) : (
                <div className="gw-muted" style={{ marginTop: 4 }}>Show na cidade-base / sem deslocamento relevante.</div>
              )}
            </div>
          </div>
        </div>

        <div className="gw-section gw-grid2">
          <div className="gw-box">
            <p className="gw-over">Casa de show</p>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{show.venue ?? 'A definir'}</div>
            <div style={{ fontSize: 12 }}>{[show.venueAddress, show.city, show.state].filter(Boolean).join(', ')}</div>
            {venueQuery && <a href={show.venueUrl ?? mapsLink(venueQuery)} style={{ fontSize: 11, color: '#1C5A44', fontWeight: 700 }}>abrir no mapa ↗</a>}
          </div>
          <div className="gw-box">
            <p className="gw-over">Hospedagem</p>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{show.lodgingName ?? (show.lodging && !isUrl(show.lodging) ? show.lodging : 'A definir')}</div>
            <div style={{ fontSize: 12 }}>{show.lodgingAddress ?? ''}</div>
            {(() => {
              const ci = items.find((i) => i.kind === 'CHECK_IN');
              const co = items.find((i) => i.kind === 'CHECK_OUT');
              return ci || co ? (
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  {ci && <>Check-in <b>{ci.time}</b> ({dayjs(ci.day).format('DD/MM')}) </>}
                  {co && <>· Check-out <b>{co.time}</b> ({dayjs(co.day).format('DD/MM')})</>}
                </div>
              ) : null;
            })()}
            {show.lodgingName && <a href={mapsLink(hotelQuery)} style={{ fontSize: 11, color: '#1C5A44', fontWeight: 700 }}>abrir no mapa ↗</a>}
            {isUrl(show.lodging) && <div><a href={show.lodging!} style={{ fontSize: 11, color: '#1C5A44', fontWeight: 700 }}>reserva ↗</a></div>}
          </div>
        </div>

        <div className="gw-section gw-grid2">
          <div className="gw-box">
            <p className="gw-over">Contatos</p>
            {show.contact && (
              <Line label="Contratante">
                {show.contact.name}{show.contact.company ? ` (${show.contact.company})` : ''}{show.contact.phone ? ` · ${show.contact.phone}` : ''}
              </Line>
            )}
            <Line label="Contato no dia">{show.contactName}</Line>
            <Line label="Produção">
              {[show.owner?.name ?? org.name, show.owner?.phone ?? org.phone, show.owner?.email ?? org.email].filter(Boolean).join(' · ')}
            </Line>
          </div>
          <div className="gw-box">
            <p className="gw-over">Logística</p>
            {show.travel && <Line label="Passagens"><Val v={show.travel} /></Line>}
            {show.techSheetUrl && <Line label="Ficha técnica"><Val v={show.techSheetUrl} /></Line>}
            {show.crewList && <Line label="Lista de equipe"><Val v={show.crewList} /></Line>}
            {show.guestList && <Line label="Convidados"><Val v={show.guestList} /></Line>}
            {!show.travel && !show.techSheetUrl && !show.crewList && !show.guestList && <div className="gw-muted" style={{ fontSize: 12 }}>—</div>}
          </div>
        </div>

        <div className="gw-section gw-grid2">
          <div className="gw-box">
            <p className="gw-over">Contrapartidas do contratante</p>
            {hosp.length ? hosp.map((h) => <span key={h} className="gw-tag">{h}</span>) : <span className="gw-muted" style={{ fontSize: 12 }}>—</span>}
            {show.hospitalityNotes && <div style={{ fontSize: 11.5, marginTop: 4 }}>{show.hospitalityNotes}</div>}
          </div>
          <div className="gw-box">
            <p className="gw-over">Checklist de produção</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 10px', fontSize: 11.5 }}>
              {SHOW_CHECKLIST.map((c) => (
                <div key={c.key}><span className="gw-check">{show[c.key] ? '✓' : ''}</span> {c.label}</div>
              ))}
            </div>
          </div>
        </div>

        {show.artist.members.length > 0 && (
          <div className="gw-section">
            <p className="gw-over">Equipe na estrada</p>
            <table className="gw-table">
              <thead><tr><th>Nome</th><th>Função</th><th>Telefone</th><th>Preferências / restrições</th></tr></thead>
              <tbody>
                {show.artist.members.map((m) => (
                  <tr key={m.id}><td><b>{m.name}</b></td><td>{m.role ?? '—'}</td><td>{m.phone ?? '—'}</td><td>{canSeeRestrictions ? m.restrictions ?? '—' : 'restrito'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showMoney && (
          <div className="gw-section gw-box">
            <p className="gw-over">Combinado</p>
            <div style={{ fontSize: 12 }}>
              <b>{DEAL_TYPE_LABEL[show.dealType as DealType]}</b> · {dealLabel(show)} · Pagamento: {PAYMENT_TERMS_LABEL[show.paymentTerms as PaymentTerms]}
              {show.paymentTerms === 'SCHEDULED' && show.paymentDueDate ? ` (${fmtDate(show.paymentDueDate)})` : ''}
              {show.dealNotes && <div className="gw-muted">“{show.dealNotes}”</div>}
            </div>
          </div>
        )}

        {show.notes && (
          <div className="gw-section gw-box">
            <p className="gw-over">Observações</p>
            <div style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{show.notes}</div>
          </div>
        )}

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#888', borderTop: '1px solid #E6E0D2', paddingTop: 6 }}>
          <span>{org.name} · Greenwaves OS</span>
          <span>Gerado em {dayjs().format('DD/MM/YYYY HH:mm')} · contém dados pessoais: uso restrito à produção (LGPD) · distâncias aproximadas</span>
        </div>
      </div>
    </>
  );
}
