import { prisma } from '@/lib/db';
import { can, requireContext } from '@/lib/tenant';
import { ContactsView } from '@/components/contacts/ContactsView';

export const metadata = { title: 'Contratantes' };

export default async function ContactsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const ctx = await requireContext();
  const contacts = await prisma.contact.findMany({
    where: { organizationId: ctx.org.id },
    include: { _count: { select: { shows: true } } },
    orderBy: { name: 'asc' },
  });
  return (
    <ContactsView
      initialQuery={q ?? ''}
      rows={contacts.map((c) => ({
        id: c.id, name: c.name, company: c.company, kind: c.kind, region: c.region, state: c.state, city: c.city,
        phone: c.phone, email: c.email, instagram: c.instagram, link: c.link, notes: c.notes, shows: c._count.shows,
      }))}
      canEdit={can(ctx, 'PRODUCER')}
      canDelete={can(ctx, 'ADMIN')}
    />
  );
}
