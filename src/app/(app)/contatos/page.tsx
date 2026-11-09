import { prisma } from '@/lib/db';
import { can, requireContext } from '@/lib/tenant';
import { ContactsView } from '@/components/contacts/ContactsView';
import { receivableState } from '@/lib/receivables';

export const metadata = { title: 'Contratantes' };

export default async function ContactsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const ctx = await requireContext();
  // Adimplência: recebimentos de cachê dos shows vinculados a cada contratante
  const fees = await prisma.transaction.findMany({
    where: { organizationId: ctx.org.id, type: 'INCOME', status: { not: 'CANCELED' }, show: { contactId: { not: null } } },
    select: { status: true, dueDate: true, date: true, paidAt: true, show: { select: { contactId: true } } },
  });
  const payments = new Map<string, { onTime: number; late: number; overdue: number; open: number }>();
  for (const f of fees) {
    const id = f.show!.contactId!;
    const p = payments.get(id) ?? { onTime: 0, late: 0, overdue: 0, open: 0 };
    const st = receivableState(f);
    if (st === 'PAID') p.onTime++;
    else if (st === 'PAID_LATE') p.late++;
    else if (st === 'OVERDUE') p.overdue++;
    else p.open++;
    payments.set(id, p);
  }
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
        payments: payments.get(c.id) ?? null,
      }))}
      canEdit={can(ctx, 'PRODUCER')}
      canDelete={can(ctx, 'ADMIN')}
    />
  );
}
