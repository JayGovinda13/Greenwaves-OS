'use server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { logActivity, requireRole } from '@/lib/tenant';
import { formToObject, runAction, UserError } from '@/lib/action';
import { transactionSchema } from '@/lib/domain';
import { money, toCalendarDate } from '@/lib/format';

function revalidate() {
  revalidatePath('/financeiro');
  revalidatePath('/dashboard');
  revalidatePath('/shows/[id]', 'page');
}

export async function saveTransaction(id: string | null, fd: FormData) {
  return runAction(async () => {
    const ctx = await requireRole('ADMIN');
    const input = transactionSchema.parse(formToObject(fd));
    if (input.showId && !(await prisma.show.findFirst({ where: { id: input.showId, organizationId: ctx.org.id }, select: { id: true } })))
      throw new UserError('Show inválido');
    if (input.artistId && !(await prisma.artist.findFirst({ where: { id: input.artistId, organizationId: ctx.org.id }, select: { id: true } })))
      throw new UserError('Artista inválido');
    const data = {
      ...input,
      amount: input.amount!,
      date: toCalendarDate(input.date),
      dueDate: input.dueDate ? toCalendarDate(input.dueDate) : null,
    };
    let txId = id;
    if (id) {
      const r = await prisma.transaction.updateMany({ where: { id, organizationId: ctx.org.id }, data });
      if (!r.count) throw new UserError('Lançamento não encontrado');
    } else txId = (await prisma.transaction.create({ data: { ...data, organizationId: ctx.org.id } })).id;
    await logActivity(ctx, id ? 'updated' : 'created', 'transaction', txId, `${input.description} (${money(data.amount, true)})`);
    revalidate();
    return { message: 'Lançamento salvo.' };
  });
}

export async function markPaid(id: string) {
  return runAction(async () => {
    const ctx = await requireRole('ADMIN');
    const r = await prisma.transaction.updateMany({ where: { id, organizationId: ctx.org.id }, data: { status: 'PAID' } });
    if (!r.count) throw new UserError('Lançamento não encontrado');
    await logActivity(ctx, 'updated', 'transaction', id, 'Marcado como pago');
    revalidate();
    return { message: 'Marcado como pago.' };
  });
}

export async function deleteTransaction(id: string) {
  return runAction(async () => {
    const ctx = await requireRole('ADMIN');
    const t = await prisma.transaction.findFirst({ where: { id, organizationId: ctx.org.id } });
    if (!t) throw new UserError('Lançamento não encontrado');
    await prisma.transaction.delete({ where: { id } });
    await logActivity(ctx, 'deleted', 'transaction', id, t.description);
    revalidate();
    return { message: 'Lançamento excluído.' };
  });
}
