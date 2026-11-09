'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireRole, logActivity } from '@/lib/tenant';
import { formToObject, runAction, UserError } from '@/lib/action';
import { SHOW_CHECKLIST, SHOW_STATUS, showSchema, ticketReportSchema, type ChecklistKey, type ShowStatus } from '@/lib/domain';
import { syncShowReceivable } from '@/lib/receivables';
import { fmtDate, toCalendarDate } from '@/lib/format';

async function assertOwned(orgId: string, artistId: string, contactId: string | null) {
  const artist = await prisma.artist.findFirst({ where: { id: artistId, organizationId: orgId }, select: { name: true } });
  if (!artist) throw new UserError('Artista inválido');
  if (contactId && !(await prisma.contact.findFirst({ where: { id: contactId, organizationId: orgId }, select: { id: true } })))
    throw new UserError('Contratante inválido');
  return artist;
}

export async function saveShow(id: string | null, fd: FormData) {
  return runAction<{ id: string }>(async () => {
    const ctx = await requireRole('PRODUCER');
    const input = showSchema.parse(formToObject(fd));
    const artist = await assertOwned(ctx.org.id, input.artistId, input.contactId);
    const data = {
      ...input,
      date: toCalendarDate(input.date),
      state: input.state?.toUpperCase() ?? null,
      paymentDueDate: input.paymentTerms === 'SCHEDULED' && input.paymentDueDate ? toCalendarDate(input.paymentDueDate) : null,
    };
    let showId = id;
    if (id) {
      const res = await prisma.show.updateMany({ where: { id, organizationId: ctx.org.id }, data });
      if (res.count === 0) throw new UserError('Show não encontrado');
    } else {
      const created = await prisma.show.create({ data: { ...data, organizationId: ctx.org.id, ownerId: ctx.user.id } });
      showId = created.id;
    }
    await syncShowReceivable(prisma, await prisma.show.findUniqueOrThrow({ where: { id: showId! } }), artist.name);
    await logActivity(ctx, id ? 'updated' : 'created', 'show', showId, `${artist.name} em ${input.city ?? input.venue ?? '—'} (${fmtDate(data.date)})`);
    revalidatePath('/shows');
    revalidatePath('/financeiro');
    revalidatePath('/dashboard');
    return { data: { id: showId! }, message: id ? 'Show atualizado.' : 'Show cadastrado.' };
  });
}

export async function deleteShow(id: string) {
  const result = await runAction(async () => {
    const ctx = await requireRole('ADMIN');
    const show = await prisma.show.findFirst({ where: { id, organizationId: ctx.org.id }, include: { artist: true } });
    if (!show) throw new UserError('Show não encontrado');
    // Recebível automático ainda não pago deixa de fazer sentido sem o show
    await prisma.transaction.deleteMany({ where: { showId: id, source: 'SHOW_FEE', status: { not: 'PAID' } } });
    await prisma.show.delete({ where: { id } });
    await logActivity(ctx, 'deleted', 'show', id, `${show.artist.name} em ${show.city ?? '—'} (${fmtDate(show.date)})`);
    revalidatePath('/shows');
    revalidatePath('/dashboard');
  });
  if (result.ok) redirect('/shows');
  return result;
}

export async function toggleChecklist(id: string, key: ChecklistKey, value: boolean) {
  return runAction(async () => {
    const ctx = await requireRole('PRODUCER');
    if (!SHOW_CHECKLIST.some((c) => c.key === key)) throw new UserError('Item inválido');
    await prisma.show.updateMany({ where: { id, organizationId: ctx.org.id }, data: { [key]: value } });
    revalidatePath(`/shows/${id}`);
    revalidatePath('/dashboard');
  });
}

export async function setShowStatus(id: string, status: ShowStatus) {
  return runAction(async () => {
    const ctx = await requireRole('PRODUCER');
    if (!SHOW_STATUS.includes(status)) throw new UserError('Status inválido');
    const r = await prisma.show.updateMany({ where: { id, organizationId: ctx.org.id }, data: { status } });
    if (!r.count) throw new UserError('Show não encontrado');
    const show = await prisma.show.findUniqueOrThrow({ where: { id }, include: { artist: { select: { name: true } } } });
    await syncShowReceivable(prisma, show, show.artist.name);
    await logActivity(ctx, 'updated', 'show', id, `Status alterado para ${status}`);
    revalidatePath('/financeiro');
    revalidatePath(`/shows/${id}`);
    revalidatePath('/shows');
    revalidatePath('/dashboard');
    return { message: 'Status atualizado.' };
  });
}

/** Registra uma atualização de vendas de ingressos (histórico datado, com fonte). */
export async function addTicketReport(showId: string, fd: FormData) {
  return runAction(async () => {
    const ctx = await requireRole('PRODUCER');
    const input = ticketReportSchema.parse(formToObject(fd));
    const show = await prisma.show.findFirst({ where: { id: showId, organizationId: ctx.org.id }, select: { id: true, capacity: true } });
    if (!show) throw new UserError('Show não encontrado');
    if (show.capacity && input.sold > show.capacity * 1.5)
      throw new UserError(`Valor muito acima da capacidade (${show.capacity}). Confira o número.`);
    const now = new Date();
    await prisma.ticketReport.create({ data: { showId, sold: input.sold, source: input.source, note: input.note, reportedById: ctx.user.id, reportedAt: now } });
    await prisma.show.update({ where: { id: showId }, data: { ticketsSold: input.sold, ticketsUpdatedAt: now } });
    await logActivity(ctx, 'updated', 'show', showId, `Vendas atualizadas: ${input.sold} ingressos`);
    revalidatePath(`/shows/${showId}`);
    revalidatePath('/shows');
    revalidatePath('/dashboard');
    return { message: 'Vendas atualizadas.' };
  });
}
