// Sugestão inicial da ficha técnica de produção a partir do que o show já tem cadastrado.
import 'server-only';
import { prisma } from './db';
import { emptyProduction, type Production } from './production';
import { parseTechRider } from './techRider';
import { scheduleSortKey } from './tour';

export async function defaultProduction(showId: string): Promise<Production> {
  const show = await prisma.show.findUniqueOrThrow({
    where: { id: showId },
    include: {
      scheduleItems: true,
      contact: { select: { name: true, phone: true } },
      owner: { select: { name: true, phone: true } },
      artist: { select: { name: true, techRider: true } },
      organization: { select: { memberships: { where: { role: 'OWNER' }, select: { user: { select: { name: true, phone: true } } } } } },
    },
  });
  const p = emptyProduction();
  const items = [...show.scheduleItems].sort((a, b) => scheduleSortKey(a).localeCompare(scheduleSortKey(b)));
  const at = (k: string) => items.find((i) => i.kind === k)?.time ?? '';

  p.soundcheck = at('SOUNDCHECK');
  p.doors = at('DOORS');
  p.showtime = at('SET');
  p.promoter = show.contact ? [show.contact.name, show.contact.phone].filter(Boolean).join(' · ') : '';
  p.responsible = show.contactName ?? '';
  p.notes = [show.hospitalityNotes, show.techNotes].filter(Boolean).join('\n');

  // Equipe: produção (responsável pelo show + sócios) e técnico da banda
  const seen = new Set<string>();
  const add = (role: string, name: string | null | undefined, phone: string | null | undefined) => {
    if (!name || seen.has(name)) return;
    seen.add(name);
    p.team.push({ role, name, phone: phone ?? '' });
  };
  add('Produção', show.owner?.name, show.owner?.phone);
  show.organization.memberships.forEach((m) => add('Produção', m.user.name, m.user.phone));
  const rider = parseTechRider(show.artist.techRider);
  if (rider?.techContact.name) add('Técnico de som', rider.techContact.name, rider.techContact.phone);

  // Cronograma da casa a partir do roteiro do dia (horários da banda em destaque)
  const RUNDOWN: Record<string, { label: string; ours: boolean }> = {
    LOAD_IN: { label: 'Montagem', ours: false },
    SOUNDCHECK: { label: `Soundcheck · ${show.artist.name}`, ours: true },
    DOORS: { label: 'Abertura da casa', ours: false },
    SET: { label: `Showtime · ${show.artist.name}`, ours: true },
    LOAD_OUT: { label: 'Desmontagem', ours: false },
  };
  const day = show.date.toISOString().slice(0, 10);
  p.rundown = items
    .filter((i) => RUNDOWN[i.kind] && i.day === day)
    .map((i) => ({ start: i.time, end: '', label: RUNDOWN[i.kind]!.label, ours: RUNDOWN[i.kind]!.ours }));
  return p;
}
