import Link from 'next/link';
import { notFound } from 'next/navigation';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { ArrowLeft, MapPin } from 'iconoir-react';
import { prisma } from '@/lib/db';
import { can, requireStaff } from '@/lib/tenant';
import { artistOptions, contactOptions } from '@/lib/queries';
import { DEAL_TYPE_LABEL, PAYMENT_TERMS_LABEL, TX_CATEGORY_LABEL, hospitalityLabels, type DealType, type PaymentTerms, type TxCategory } from '@/lib/domain';
import { TicketSalesCard } from '@/components/shows/TicketSalesCard';
import { ScheduleCard } from '@/components/shows/ScheduleCard';
import { ShowTechRiderCard } from '@/components/techrider/ShowTechRiderCard';
import { parseTechRider } from '@/lib/techRider';
import { parseProduction, TRAVEL_WINDOW_AFTER, TRAVEL_WINDOW_BEFORE } from '@/lib/production';
import { defaultProduction } from '@/lib/productionDefaults';
import { ProductionCard } from '@/components/production/ProductionCard';
import { TravelCard } from '@/components/production/TravelCard';
import { dayjs, fmtDate, isUrl, money } from '@/lib/format';
import { ResourceLink } from '@/components/ui/ResourceLink';
import { TxStatusChip } from '@/components/ui/StatusChip';
import { ShowHeaderActions } from '@/components/shows/ShowHeaderActions';
import { ShowChecklist } from '@/components/shows/ShowChecklist';
import { FOREST_GRADIENT, BRAND } from '@/theme/brand';
import { dealLabel } from '@/components/shows/dealLabel';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.6 }}>{label}</Typography>
      <Typography sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{value || '—'}</Typography>
    </Box>
  );
}
function MaybeLink({ value }: { value: string | null }) {
  if (!value) return <>—</>;
  return isUrl(value) ? (
    <a href={value} target="_blank" rel="noreferrer" style={{ color: 'inherit', fontWeight: 700 }}>Abrir link ↗</a>
  ) : (
    <>{value}</>
  );
}

export default async function ShowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireStaff();
  const show = await prisma.show.findFirst({
    where: { id, organizationId: ctx.org.id },
    include: {
      artist: true,
      contact: true,
      owner: { select: { name: true } },
      transactions: { orderBy: { date: 'asc' } },
      ticketReports: { orderBy: { reportedAt: 'desc' }, take: 30, include: { reportedBy: { select: { name: true } } } },
      scheduleItems: true,
    },
  });
  if (!show) notFound();
  const DAY = 86400000;
  const showDay = show.date.toISOString().slice(0, 10);
  const dayOffset = (n: number) => new Date(show.date.getTime() + n * DAY).toISOString().slice(0, 10);
  const [artists, contacts, legs, nearby, suggestion] = await Promise.all([
    artistOptions(ctx.org.id),
    contactOptions(ctx.org.id),
    prisma.travelLeg.findMany({
      where: { organizationId: ctx.org.id, artistId: show.artistId, date: { gte: dayOffset(-TRAVEL_WINDOW_BEFORE), lte: dayOffset(TRAVEL_WINDOW_AFTER) } },
      orderBy: [{ date: 'asc' }, { departure: 'asc' }],
    }),
    prisma.show.findMany({
      where: { organizationId: ctx.org.id, artistId: show.artistId, status: { not: 'CANCELED' }, date: { gte: new Date(show.date.getTime() - 10 * DAY), lte: new Date(show.date.getTime() + 10 * DAY) } },
      select: { id: true, date: true, city: true, venue: true },
      orderBy: { date: 'asc' },
    }),
    defaultProduction(show.id),
  ]);
  const receivable = show.transactions.find((t) => t.source === 'SHOW_FEE') ?? null;
  const hospitality = hospitalityLabels(show.hospitality);
  const d = dayjs.utc(show.date);

  return (
    <>
      <Box component={Link} href="/shows" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, color: 'text.secondary', textDecoration: 'none', fontWeight: 700, mb: 2 }}>
        <ArrowLeft width={18} /> Agenda de shows
      </Box>

      <Card sx={{ background: FOREST_GRADIENT, color: BRAND.cream, border: 0, p: { xs: 2.5, md: 4 }, mb: 3 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', gap: { xs: 2, md: 3 }, alignItems: 'center' }}>
            <Box sx={{ textAlign: 'center', bgcolor: BRAND.lime, color: BRAND.ink, borderRadius: 3, px: 2, py: 1.25, minWidth: 84 }}>
              <Typography sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: 13 }}>{d.format('MMM')}</Typography>
              <Typography variant="h2" component="div" sx={{ fontSize: '2.6rem', lineHeight: 1 }}>{d.format('DD')}</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 700, textTransform: 'capitalize' }}>{d.format('ddd YYYY')}</Typography>
            </Box>
            <Box>
              <Typography variant="overline" sx={{ color: BRAND.lime }}>{show.eventName ?? 'Show'}</Typography>
              <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '2rem', md: '3rem' } }}>
                <Box component={Link} href={`/artistas/${show.artist.id}`} sx={{ color: 'inherit', textDecoration: 'none' }}>{show.artist.name}</Box>
              </Typography>
              <Typography sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1, opacity: 0.9 }}>
                <MapPin width={18} />
                {[show.venue, [show.city, show.state].filter(Boolean).join(' · ')].filter(Boolean).join(' — ') || 'Local a definir'}
                {show.venueUrl && <a href={show.venueUrl} target="_blank" rel="noreferrer" style={{ color: BRAND.lime, fontWeight: 700, marginLeft: 6 }}>mapa ↗</a>}
              </Typography>
            </Box>
          </Box>
          <ShowHeaderActions
            show={show}
            artists={artists}
            contacts={contacts}
            canEdit={can(ctx, 'PRODUCER')}
            canDelete={can(ctx, 'ADMIN')}
          />
        </Box>
      </Card>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3, alignItems: 'start' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <ProductionCard
            showId={show.id}
            saved={parseProduction(show.production)}
            suggestion={suggestion}
            nearby={nearby.map((n) => ({ id: n.id, date: n.date.toISOString().slice(0, 10), city: n.city, venue: n.venue }))}
            canEdit={can(ctx, 'PRODUCER')}
          />
          <TravelCard
            artistId={show.artistId}
            showDay={showDay}
            canEdit={can(ctx, 'PRODUCER')}
            legs={legs.map((l) => ({
              id: l.id, mode: l.mode, direction: l.direction, passengers: l.passengers, company: l.company, code: l.code, origin: l.origin,
              destination: l.destination, date: l.date, departure: l.departure, arrival: l.arrival, boarding: l.boarding,
              tickets: (Array.isArray(l.tickets) ? l.tickets : []) as { label: string; url: string }[], notes: l.notes,
            }))}
          />
          <ScheduleCard
            showId={show.id}
            showDay={show.date.toISOString().slice(0, 10)}
            canEdit={can(ctx, 'PRODUCER')}
            items={show.scheduleItems.map((i) => ({ id: i.id, kind: i.kind, day: i.day, time: i.time, title: i.title, location: i.location, notes: i.notes, done: i.done }))}
          />
          <Card sx={{ p: 3 }}>
            <Typography variant="h5" mb={2}>Combinado</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
              <Field label="Modelo" value={DEAL_TYPE_LABEL[show.dealType as DealType] ?? show.dealType} />
              <Field label="Valor" value={<Typography component="span" variant="h4">{dealLabel(show)}</Typography>} />
              <Field
                label="Pagamento"
                value={
                  <Box component="span" sx={{ display: 'inline-flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-start' }}>
                    <span>
                      {PAYMENT_TERMS_LABEL[show.paymentTerms as PaymentTerms] ?? show.paymentTerms}
                      {show.paymentTerms === 'SCHEDULED' && show.paymentDueDate ? ` · ${fmtDate(show.paymentDueDate)}` : ''}
                    </span>
                    {receivable && <TxStatusChip status={receivable.status} dueDate={receivable.dueDate} date={receivable.date} paidAt={receivable.paidAt} />}
                  </Box>
                }
              />
            </Box>
            <Box sx={{ mt: 2.5 }}>
              <Typography variant="overline" color="text.secondary">Contrapartidas</Typography>
              {hospitality.length ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.5 }}>
                  {hospitality.map((h) => <Chip key={h} label={h} size="small" color="primary" variant="outlined" />)}
                </Box>
              ) : (
                <Typography>—</Typography>
              )}
              {show.hospitalityNotes && <Typography variant="body2" color="text.secondary" mt={1}>{show.hospitalityNotes}</Typography>}
            </Box>
            {show.dealNotes && (
              <Box sx={{ mt: 2, p: 2, borderRadius: 3, bgcolor: 'action.hover' }}>
                <Typography variant="overline" color="text.secondary">Texto do combinado</Typography>
                <Typography>{show.dealNotes}</Typography>
              </Box>
            )}
          </Card>

          <Card sx={{ p: 3 }}>
            <Typography variant="h5" mb={2}>Bilheteria & divulgação</Typography>
            <TicketSalesCard
              showId={show.id}
              showDate={show.date.toISOString()}
              capacity={show.capacity}
              ticketPrice={show.ticketPrice}
              canEdit={can(ctx, 'PRODUCER')}
              reports={show.ticketReports.map((r) => ({
                id: r.id, sold: r.sold, source: r.source, note: r.note, reportedAt: r.reportedAt.toISOString(), reportedBy: r.reportedBy?.name ?? null,
              }))}
            />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 2.5 }}>
              <ResourceLink href={show.ticketUrl} label="Ingressos" icon="link" />
              <ResourceLink href={show.posterUrl} label="Cartaz" icon="photo" />
              <ResourceLink href={show.socialUrl} label="Redes sociais" icon="instagram" />
            </Box>
            {(show.ticketUrl && !isUrl(show.ticketUrl)) || (show.posterUrl && !isUrl(show.posterUrl)) ? (
              <Typography variant="body2" color="text.secondary" mt={1.5}>
                {[show.ticketUrl && !isUrl(show.ticketUrl) ? `Ingressos: ${show.ticketUrl}` : null, show.posterUrl && !isUrl(show.posterUrl) ? `Cartaz: ${show.posterUrl}` : null].filter(Boolean).join(' · ')}
              </Typography>
            ) : null}
          </Card>

          <Card sx={{ p: 3 }}>
            <Typography variant="h5" mb={2}>Pré-produção & logística</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
              <Field label="Endereço da casa" value={show.venueAddress} />
              <Field label="Hotel" value={[show.lodgingName, show.lodgingAddress].filter(Boolean).join(' — ') || null} />
              <Field label="Ficha técnica" value={<MaybeLink value={show.techSheetUrl} />} />
              <Field label="Passagens" value={<MaybeLink value={show.travel} />} />
              <Field label="Hospedagem" value={<MaybeLink value={show.lodging} />} />
              <Field label="Lista de equipe" value={<MaybeLink value={show.crewList} />} />
              <Field label="Lista de convidados" value={<MaybeLink value={show.guestList} />} />
              <Field label="Observações" value={show.notes} />
            </Box>
          </Card>

          <Card sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h5">Financeiro do show</Typography>
              <Typography component={Link} href={`/financeiro?show=${show.id}`} sx={{ fontWeight: 700, color: 'primary.main', textDecoration: 'none' }}>
                Ver no financeiro →
              </Typography>
            </Box>
            {show.transactions.length === 0 ? (
              <Typography color="text.secondary">Nenhum lançamento vinculado.</Typography>
            ) : (
              show.transactions.map((t, i) => (
                <Box key={t.id}>
                  {i > 0 && <Divider />}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.25 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography fontWeight={700} noWrap>{t.description}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {TX_CATEGORY_LABEL[t.category as TxCategory]} · vence {fmtDate(t.dueDate ?? t.date)}
                        {t.paidAt ? ` · pago em ${fmtDate(t.paidAt)}` : ''}
                      </Typography>
                    </Box>
                    <TxStatusChip status={t.status} dueDate={t.dueDate} date={t.date} paidAt={t.paidAt} />
                    <Typography fontWeight={800} color={t.type === 'INCOME' ? 'success.main' : 'error.main'}>
                      {t.type === 'INCOME' ? '+' : '−'} {money(t.amount, true)}
                    </Typography>
                  </Box>
                </Box>
              ))
            )}
          </Card>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <ShowTechRiderCard
            showId={show.id}
            artistId={show.artist.id}
            artistRider={parseTechRider(show.artist.techRider)}
            showRider={parseTechRider(show.techRider)}
            venueTechContact={show.venueTechContact}
            techNotes={show.techNotes}
            canEdit={can(ctx, 'PRODUCER')}
          />
          <ShowChecklist show={show} canEdit={can(ctx, 'PRODUCER')} />
          <Card sx={{ p: 3 }}>
            <Typography variant="h5" mb={2}>Contratante</Typography>
            {show.contact ? (
              <Box component={Link} href={`/contatos?q=${encodeURIComponent(show.contact.name)}`} sx={{ color: 'inherit', textDecoration: 'none' }}>
                <Typography fontWeight={800}>{show.contact.name}</Typography>
                <Typography color="text.secondary">{[show.contact.company, show.contact.city].filter(Boolean).join(' · ')}</Typography>
                {show.contact.phone && <Typography mt={1}>{show.contact.phone}</Typography>}
                {show.contact.email && <Typography>{show.contact.email}</Typography>}
              </Box>
            ) : (
              <Typography color="text.secondary">Nenhum contratante do CRM vinculado.</Typography>
            )}
            {show.contactName && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="overline" color="text.secondary">Contato no dia</Typography>
                <Typography fontWeight={700}>{show.contactName}</Typography>
              </Box>
            )}
          </Card>
          <Card sx={{ p: 3 }}>
            <Typography variant="h5" mb={2}>Materiais do artista</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1.25 }}>
              <ResourceLink href={show.artist.mediaKitUrl} label="Mídia kit" icon="doc" />
              <ResourceLink href={show.artist.riderUrl} label="Rider e mapa de palco" icon="rider" />
              <ResourceLink href={show.artist.photosUrl} label="Fotos de divulgação" icon="photo" />
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {show.owner && <Chip size="small" label={`Responsável: ${show.owner.name}`} />}
              <Chip size="small" variant="outlined" label={`Atualizado ${dayjs(show.updatedAt).fromNow()}`} />
            </Box>
          </Card>
        </Box>
      </Box>
    </>
  );
}
