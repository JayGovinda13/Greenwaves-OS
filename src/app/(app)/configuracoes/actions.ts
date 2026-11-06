'use server';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { logActivity, requireRole } from '@/lib/tenant';
import { formToObject, runAction, UserError } from '@/lib/action';
import { ROLES, ROLE_RANK, type Role } from '@/lib/domain';
import { importIntoOrganization, parseGreenWaveWorkbook, type ImportSummary } from '@/lib/importers/greenwave-xlsx';

const orgSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome'),
  email: z.string().trim().optional().transform((v) => v || null),
  phone: z.string().trim().optional().transform((v) => v || null),
  instagram: z.string().trim().optional().transform((v) => v || null),
  city: z.string().trim().optional().transform((v) => v || null),
});

export async function saveOrganization(fd: FormData) {
  return runAction(async () => {
    const ctx = await requireRole('ADMIN');
    const data = orgSchema.parse(formToObject(fd));
    await prisma.organization.update({ where: { id: ctx.org.id }, data });
    await logActivity(ctx, 'updated', 'organization', ctx.org.id, data.name);
    revalidatePath('/', 'layout');
    return { message: 'Dados da produtora atualizados.' };
  });
}

const inviteSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome'),
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  role: z.enum(ROLES),
});

/** Adiciona um membro. Se o usuário não existir, cria com senha temporária (exibida uma única vez). */
export async function inviteMember(fd: FormData) {
  return runAction<{ tempPassword?: string }>(async () => {
    const ctx = await requireRole('ADMIN');
    const input = inviteSchema.parse(formToObject(fd));
    if (ROLE_RANK[input.role] > ROLE_RANK[ctx.role]) throw new UserError('Você não pode conceder um papel acima do seu.');
    let user = await prisma.user.findUnique({ where: { email: input.email } });
    let tempPassword: string | undefined;
    if (!user) {
      tempPassword = crypto.randomBytes(6).toString('base64url');
      user = await prisma.user.create({ data: { name: input.name, email: input.email, passwordHash: await bcrypt.hash(tempPassword, 10) } });
    }
    const exists = await prisma.membership.findUnique({ where: { userId_organizationId: { userId: user.id, organizationId: ctx.org.id } } });
    if (exists) throw new UserError('Essa pessoa já faz parte da equipe.');
    await prisma.membership.create({ data: { userId: user.id, organizationId: ctx.org.id, role: input.role } });
    await logActivity(ctx, 'created', 'user', user.id, `${input.name} (${input.role})`);
    revalidatePath('/configuracoes');
    return { data: { tempPassword }, message: 'Membro adicionado.' };
  });
}

export async function changeRole(membershipId: string, role: Role) {
  return runAction(async () => {
    const ctx = await requireRole('ADMIN');
    if (!ROLES.includes(role)) throw new UserError('Papel inválido');
    const m = await prisma.membership.findFirst({ where: { id: membershipId, organizationId: ctx.org.id } });
    if (!m) throw new UserError('Membro não encontrado');
    if (m.userId === ctx.user.id) throw new UserError('Você não pode alterar o próprio papel.');
    if (ROLE_RANK[role] > ROLE_RANK[ctx.role] || ROLE_RANK[m.role as Role] > ROLE_RANK[ctx.role]) throw new UserError('Permissão insuficiente.');
    await prisma.membership.update({ where: { id: m.id }, data: { role } });
    revalidatePath('/configuracoes');
    return { message: 'Papel atualizado.' };
  });
}

export async function removeMember(membershipId: string) {
  return runAction(async () => {
    const ctx = await requireRole('ADMIN');
    const m = await prisma.membership.findFirst({ where: { id: membershipId, organizationId: ctx.org.id }, include: { user: true } });
    if (!m) throw new UserError('Membro não encontrado');
    if (m.userId === ctx.user.id) throw new UserError('Você não pode remover a si mesmo.');
    if (m.role === 'OWNER' && ctx.role !== 'OWNER') throw new UserError('Apenas sócios podem remover sócios.');
    await prisma.membership.delete({ where: { id: m.id } });
    await logActivity(ctx, 'deleted', 'user', m.userId, m.user.name);
    revalidatePath('/configuracoes');
    return { message: 'Membro removido.' };
  });
}

const passwordSchema = z.object({
  current: z.string().min(1, 'Informe a senha atual'),
  next: z.string().min(8, 'A nova senha precisa ter ao menos 8 caracteres'),
});

export async function changePassword(fd: FormData) {
  return runAction(async () => {
    const ctx = await requireRole('VIEWER');
    const input = passwordSchema.parse(formToObject(fd));
    const user = await prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id } });
    if (!(await bcrypt.compare(input.current, user.passwordHash))) throw new UserError('Senha atual incorreta.');
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(input.next, 10) } });
    return { message: 'Senha alterada.' };
  });
}

export async function importWorkbook(fd: FormData) {
  return runAction<ImportSummary>(async () => {
    const ctx = await requireRole('ADMIN');
    const file = fd.get('file');
    if (!(file instanceof File) || file.size === 0) throw new UserError('Selecione um arquivo .xlsx');
    if (!file.name.toLowerCase().endsWith('.xlsx')) throw new UserError('Formato inválido: envie um arquivo .xlsx');
    if (file.size > 10 * 1024 * 1024) throw new UserError('Arquivo muito grande (máx. 10 MB).');
    let parsed;
    try {
      parsed = await parseGreenWaveWorkbook(await file.arrayBuffer());
    } catch {
      throw new UserError('Não foi possível ler a planilha.');
    }
    const summary = await importIntoOrganization(prisma, ctx.org.id, parsed);
    await logActivity(ctx, 'imported', 'workbook', null, `${file.name}: ${summary.showsCreated} shows novos, ${summary.showsUpdated} atualizados`);
    revalidatePath('/', 'layout');
    return { data: summary, message: 'Planilha importada.' };
  });
}
