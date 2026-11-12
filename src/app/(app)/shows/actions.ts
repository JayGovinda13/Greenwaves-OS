'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireRole, logActivity } from '@/lib/tenant';
import { formToObject, runAction, UserError } from '@/lib/action';
import { SHOW_CHECKLIST, SHOW_STATUS, scheduleItemSchema, showSchema, ticketReportSchema, type ChecklistKey, type ShowStatus } from '@/lib/domain';
import { syncShowReceivable } from '@/lib/receivables';
import { defaultSchedule, legToShow } from '@/lib/tour';
import { techRiderSchema } from '@/lib/techRider';
import { Prisma } from '@prisma/client';
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

// ---------- Roteiro do dia (roadbook) ----------
async function ownedShow(orgId: string, showId: string) {
  const show = await prisma.show.findFirst({ where: { id: showId, organizationId: orgId }, select: { id: true } });
  if (!show) throw new UserError('Show não encontrado');
}

export async function saveScheduleItem(showId: string, itemId: string | null, fd: FormData) {
  return runAction(async () => {
    const ctx = await requireRole('PRODUCER');
    await ownedShow(ctx.org.id, showId);
    const input = scheduleItemSchema.parse(formToObject(fd));
    if (itemId) {
      const r = await prisma.showScheduleItem.updateMany({ where: { id: itemId, showId }, data: input });
      if (!r.count) throw new UserError('Horário não encontrado');
    } else await prisma.showScheduleItem.create({ data: { ...input, showId } });
    revalidatePath(`/shows/${showId}`);
    return { message: 'Roteiro atualizado.' };
  });
}

export async function deleteScheduleItem(showId: string, itemId: string) {
  return runAction(async () => {
    const ctx = await requireRole('PRODUCER');
    await ownedShow(ctx.org.id, showId);
    await prisma.showScheduleItem.deleteMany({ where: { id: itemId, showId } });
    revalidatePath(`/shows/${showId}`);
    return { message: 'Horário removido.' };
  });
}

export async function toggleScheduleItem(showId: string, itemId: string, done: boolean) {
  return runAction(async () => {
    const ctx = await requireRole('PRODUCER');
    await ownedShow(ctx.org.id, showId);
    await prisma.showScheduleItem.updateMany({ where: { id: itemId, showId }, data: { done } });
    revalidatePath(`/shows/${showId}`);
  });
}

/** Cria o roteiro padrão (só quando o show ainda não tem horários). */
export async function generateSchedule(showId: string) {
  return runAction(async () => {
    const ctx = await requireRole('PRODUCER');
    await ownedShow(ctx.org.id, showId);
    if (await prisma.showScheduleItem.count({ where: { showId } })) throw new UserError('Este show já tem roteiro.');
    const { show, leg } = await legToShow(ctx.org.id, showId);
    const items = defaultSchedule(show.date.toISOString().slice(0, 10), leg);
    await prisma.showScheduleItem.createMany({
      data: items.map((i) => ({ ...i, showId, title: i.title ?? null, location: i.location ?? null })),
    });
    await logActivity(ctx, 'updated', 'show', showId, 'Roteiro do dia gerado');
    revalidatePath(`/shows/${showId}`);
    return { message: 'Roteiro padrão criado: ajuste os horários.' };
  });
}

// ---------- Ficha técnica do show ----------
/** Personaliza a ficha técnica só para este show (null = volta a usar o modelo do artista). */
export async function saveShowTechRider(showId: string, data: unknown | null) {
  return runAction(async () => {
    const ctx = await requireRole('PRODUCER');
    await ownedShow(ctx.org.id, showId);
    const rider = data === null ? Prisma.DbNull : techRiderSchema.parse(data);
    await prisma.show.update({ where: { id: showId }, data: { techRider: rider } });
    revalidatePath(`/shows/${showId}`);
    return { message: data === null ? 'Ficha voltou a seguir o modelo do artista.' : 'Ficha técnica deste show salva.' };
  });
}

export async function saveShowTechInfo(showId: string, fd: FormData) {
  return runAction(async () => {
    const ctx = await requireRole('PRODUCER');
    await ownedShow(ctx.org.id, showId);
    const v = formToObject(fd);
    await prisma.show.update({
      where: { id: showId },
      data: { venueTechContact: v.venueTechContact?.trim().slice(0, 300) || null, techNotes: v.techNotes?.trim().slice(0, 2000) || null },
    });
    revalidatePath(`/shows/${showId}`);
    return { message: 'Informações técnicas salvas.' };
  });
}
