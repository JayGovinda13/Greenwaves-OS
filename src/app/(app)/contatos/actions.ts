'use server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { logActivity, requireRole } from '@/lib/tenant';
import { formToObject, runAction, UserError } from '@/lib/action';
import { contactSchema, REGION_BY_STATE } from '@/lib/domain';

export async function saveContact(id: string | null, fd: FormData) {
  return runAction(async () => {
    const ctx = await requireRole('PRODUCER');
    const input = contactSchema.parse(formToObject(fd));
    const state = input.state?.toUpperCase() ?? null;
    // A região é sempre derivada do estado
    const data = { ...input, state, region: state ? REGION_BY_STATE[state] ?? null : null };
    let contactId = id;
    if (id) {
      const r = await prisma.contact.updateMany({ where: { id, organizationId: ctx.org.id }, data });
      if (!r.count) throw new UserError('Contato não encontrado');
    } else contactId = (await prisma.contact.create({ data: { ...data, organizationId: ctx.org.id } })).id;
    await logActivity(ctx, id ? 'updated' : 'created', 'contact', contactId, [input.name, input.company].filter(Boolean).join(' · '));
    revalidatePath('/contatos');
    return { message: id ? 'Contato atualizado.' : 'Contato cadastrado.' };
  });
}

export async function deleteContact(id: string) {
  return runAction(async () => {
    const ctx = await requireRole('ADMIN');
    const c = await prisma.contact.findFirst({ where: { id, organizationId: ctx.org.id } });
    if (!c) throw new UserError('Contato não encontrado');
    await prisma.contact.delete({ where: { id } });
    await logActivity(ctx, 'deleted', 'contact', id, c.name);
    revalidatePath('/contatos');
    return { message: 'Contato excluído.' };
  });
}
