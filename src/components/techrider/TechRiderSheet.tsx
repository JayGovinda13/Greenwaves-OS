import { BACKLINE_PROVIDER_LABEL, MONITOR_TYPE_LABEL, type TechRider } from '@/lib/techRider';
import { dayjs } from '@/lib/format';
import { SheetHeader } from '@/components/print/SheetHeader';
import { StagePlot } from './StagePlot';

export interface SheetShowInfo {
  date: string; // YYYY-MM-DD
  venue: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  eventName: string | null;
  times: { label: string; time: string; day: string }[];
  venueTechContact: string | null;
  techNotes: string | null;
  customized: boolean;
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div style={{ fontSize: 12, marginBottom: 3 }}>
      <span className="gw-muted" style={{ fontWeight: 700 }}>{label}: </span>{value}
    </div>
  );
}

/** Folha A4 da ficha técnica (rider técnico) com mapa de palco. */
export function TechRiderSheet({ artistName, rider, show, production }: {
  artistName: string;
  rider: TechRider;
  show: SheetShowInfo | null;
  production: { name: string; phone: string | null; email: string | null };
}) {
  const venueItems = rider.backline.filter((b) => b.provider === 'VENUE');
  const bandItems = rider.backline.filter((b) => b.provider === 'BAND');
  const d = show ? dayjs(show.date) : null;
  const minutes = [
    rider.setMinutes && `Show: ${rider.setMinutes} min`,
    rider.soundcheckMinutes && `Passagem de som: ${rider.soundcheckMinutes} min`,
    rider.changeoverMinutes && `Troca de palco: ${rider.changeoverMinutes} min`,
  ].filter(Boolean).join(' · ');

  return (
    <div className="gw-sheet">
      <SheetHeader
        kind="FICHA TÉCNICA"
        title={artistName}
        subtitle={
          show
            ? [show.eventName, show.venue, [show.city, show.state].filter(Boolean).join(' · ')].filter(Boolean).join(' — ')
            : 'Rider técnico e mapa de palco'
        }
        right={
          d ? (
            <div style={{ background: '#C9E13E', color: '#17201C', borderRadius: 10, padding: '6px 12px', textAlign: 'center', minWidth: 76 }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>{d.format('MMM')}</div>
              <div className="gw-display" style={{ fontSize: 30 }}>{d.format('DD')}</div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'capitalize' }}>{d.format('ddd YYYY')}</div>
            </div>
          ) : undefined
        }
      />

      {show && (
        <div className="gw-section gw-grid2">
          <div className="gw-box">
            <p className="gw-over">Evento</p>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{show.venue ?? 'Local a definir'}</div>
            <div style={{ fontSize: 12 }}>{[show.address, show.city, show.state].filter(Boolean).join(', ')}</div>
            <Info label="Contato técnico da casa" value={show.venueTechContact} />
          </div>
          <div className="gw-box">
            <p className="gw-over">Horários</p>
            {show.times.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 10px', fontSize: 12 }}>
                {show.times.map((t) => (
                  <div key={t.label + t.time} style={{ display: 'contents' }}>
                    <b className="gw-display" style={{ fontSize: 13 }}>{t.time}</b>
                    <span>{t.label}{t.day !== show.date ? ` (${dayjs(t.day).format('DD/MM')})` : ''}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="gw-muted" style={{ fontSize: 12 }}>A combinar com a produção.</div>
            )}
          </div>
        </div>
      )}

      <div className="gw-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <p className="gw-over">Mapa de palco</p>
          {(rider.stage.minWidth || rider.stage.minDepth) && (
            <span style={{ fontSize: 11, fontWeight: 700 }}>
              Palco mínimo: {rider.stage.minWidth || '?'} m × {rider.stage.minDepth || '?'} m
            </span>
          )}
        </div>
        <StagePlot items={rider.stage.items} />
      </div>

      <div className="gw-section" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
        <div>
          <p className="gw-over">Lista de canais</p>
          <table className="gw-table">
            <thead><tr><th style={{ width: 28 }}>Ch</th><th>Fonte</th><th>Mic / DI</th><th>Pedestal</th><th>Obs.</th></tr></thead>
            <tbody>
              {rider.inputs.map((i, n) => (
                <tr key={n}><td><b>{n + 1}</b></td><td><b>{i.source}</b></td><td>{i.mic}</td><td>{i.stand}</td><td>{i.notes}</td></tr>
              ))}
              {rider.inputs.length === 0 && <tr><td colSpan={5} className="gw-muted">—</td></tr>}
            </tbody>
          </table>
        </div>
        <div>
          <p className="gw-over">Formação</p>
          <table className="gw-table">
            <tbody>
              {rider.lineup.map((l, n) => (
                <tr key={n}><td><b>{l.role}</b></td><td>{l.name}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="gw-over" style={{ marginTop: 12 }}>Retornos</p>
          <table className="gw-table">
            <thead><tr><th style={{ width: 28 }}>Via</th><th>Para</th><th>Tipo</th></tr></thead>
            <tbody>
              {rider.monitors.map((m, n) => (
                <tr key={n}>
                  <td><b>{n + 1}</b></td>
                  <td>{m.who}{m.notes && <div className="gw-muted" style={{ fontSize: 10 }}>{m.notes}</div>}</td>
                  <td>{MONITOR_TYPE_LABEL[m.type]}</td>
                </tr>
              ))}
              {rider.monitors.length === 0 && <tr><td colSpan={3} className="gw-muted">—</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="gw-section gw-grid2">
        {[
          { title: BACKLINE_PROVIDER_LABEL.VENUE, items: venueItems },
          { title: BACKLINE_PROVIDER_LABEL.BAND, items: bandItems },
        ].map((g) => (
          <div key={g.title} className="gw-box">
            <p className="gw-over">Backline · {g.title}</p>
            {g.items.length ? g.items.map((b, n) => (
              <div key={n} style={{ fontSize: 12, marginBottom: 4 }}>
                <span className="gw-check" /> <b>{b.qty ? `${b.qty}× ` : ''}{b.item}</b>
                {b.notes && <span className="gw-muted"> — {b.notes}</span>}
              </div>
            )) : <div className="gw-muted" style={{ fontSize: 12 }}>—</div>}
          </div>
        ))}
      </div>

      <div className="gw-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        {[['PA e mesa', rider.pa], ['Luz', rider.lights], ['Energia', rider.power]].map(([t, v]) => (
          <div key={t} className="gw-box">
            <p className="gw-over">{t}</p>
            <div style={{ fontSize: 11.5, whiteSpace: 'pre-wrap' }}>{v || '—'}</div>
          </div>
        ))}
      </div>

      {(rider.notes || show?.techNotes || minutes) && (
        <div className="gw-section gw-box">
          <p className="gw-over">Observações</p>
          {minutes && <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{minutes}</div>}
          {rider.notes && <div style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{rider.notes}</div>}
          {show?.techNotes && <div style={{ fontSize: 12, whiteSpace: 'pre-wrap', marginTop: 4 }}><b>Para este show:</b> {show.techNotes}</div>}
        </div>
      )}

      <div className="gw-section gw-grid2">
        <div className="gw-box">
          <p className="gw-over">Técnico da banda</p>
          <div style={{ fontSize: 12 }}>{[rider.techContact.name, rider.techContact.phone, rider.techContact.email].filter(Boolean).join(' · ') || '—'}</div>
        </div>
        <div className="gw-box">
          <p className="gw-over">Produção</p>
          <div style={{ fontSize: 12 }}>{[production.name, production.phone, production.email].filter(Boolean).join(' · ')}</div>
        </div>
      </div>

      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#888', borderTop: '1px solid #E6E0D2', paddingTop: 6 }}>
        <span>Greenwaves OS{show?.customized ? ' · ficha ajustada para este show' : ''}</span>
        <span>Gerado em {dayjs().format('DD/MM/YYYY HH:mm')}</span>
      </div>
    </div>
  );
}
