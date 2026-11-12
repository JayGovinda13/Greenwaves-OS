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
import { generateToken, TOKEN_TTL_DAYS } from '@/lib/mcp/tokens';
import { MN_EXAMPLE } from '@/lib/examples/molhoNegro';
import { CASTING_2026 } from '../../../../prisma/data/casting';
import { slugify, toCalendarDate } from '@/lib/format';

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
    if (!(ROLES as readonly string[]).includes(role)) throw new UserError('Papel inválido');
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
    const ctx = await requireRole('ARTIST');
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

// ---------- Integração com Claude (MCP) ----------
/** Liga/desliga a integração com IA para a produtora inteira. Só sócios(as): é a decisão do controlador (LGPD). */
export async function setAiIntegration(enabled: boolean) {
  return runAction(async () => {
    const ctx = await requireRole('OWNER');
    await prisma.organization.update({
      where: { id: ctx.org.id },
      data: enabled ? { aiEnabled: true, aiEnabledAt: new Date(), aiEnabledById: ctx.user.id } : { aiEnabled: false },
    });
    if (!enabled) {
      // desligar revoga todas as chaves imediatamente
      await prisma.apiToken.updateMany({ where: { organizationId: ctx.org.id, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    await logActivity(ctx, 'updated', 'organization', ctx.org.id, enabled ? 'Integração com IA (Claude) ativada' : 'Integração com IA desativada e chaves revogadas');
    revalidatePath('/configuracoes');
    return { message: enabled ? 'Integração ativada.' : 'Integração desativada; todas as chaves foram revogadas.' };
  });
}

const tokenSchema = z.object({
  name: z.string().trim().min(2, 'Dê um nome para a chave (ex.: Claude no notebook)').max(60),
  scope: z.enum(['READ', 'WRITE']),
  ttl: z.coerce.number().refine((n) => (TOKEN_TTL_DAYS as readonly number[]).includes(n), 'Validade inválida'),
  accept: z.literal('on', { errorMap: () => ({ message: 'Confirme que leu o aviso de privacidade.' }) }),
});

/** Gera uma chave pessoal. A chave em texto aparece só nesta resposta; guardamos apenas o hash. */
export async function createApiToken(fd: FormData) {
  return runAction<{ token: string }>(async () => {
    const ctx = await requireRole('VIEWER');
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: ctx.org.id }, select: { aiEnabled: true } });
    if (!org.aiEnabled) throw new UserError('A integração com IA não está ativada nesta produtora.');
    const input = tokenSchema.parse(formToObject(fd));
    if (input.scope === 'WRITE' && ROLE_RANK[ctx.role] < ROLE_RANK.PRODUCER) throw new UserError('Seu papel só permite chaves de leitura.');
    const active = await prisma.apiToken.count({ where: { userId: ctx.user.id, organizationId: ctx.org.id, revokedAt: null, expiresAt: { gt: new Date() } } });
    if (active >= 5) throw new UserError('Você já tem 5 chaves ativas. Revogue uma antes de criar outra.');
    const { token, hash, prefix } = generateToken();
    await prisma.apiToken.create({
      data: {
        organizationId: ctx.org.id, userId: ctx.user.id, name: input.name, prefix, tokenHash: hash, scope: input.scope,
        expiresAt: new Date(Date.now() + input.ttl * 24 * 3600 * 1000),
      },
    });
    await logActivity(ctx, 'created', 'api_token', null, `Chave "${input.name}" (${input.scope === 'WRITE' ? 'leitura e escrita' : 'leitura'})`);
    revalidatePath('/configuracoes');
    return { data: { token }, message: 'Chave criada. Copie agora: ela não será exibida de novo.' };
  });
}

export async function revokeApiToken(id: string) {
  return runAction(async () => {
    const ctx = await requireRole('VIEWER');
    const t = await prisma.apiToken.findFirst({ where: { id, organizationId: ctx.org.id } });
    if (!t) throw new UserError('Chave não encontrada.');
    if (t.userId !== ctx.user.id && ROLE_RANK[ctx.role] < ROLE_RANK.ADMIN) throw new UserError('Você só pode revogar as suas chaves.');
    await prisma.apiToken.update({ where: { id }, data: { revokedAt: new Date() } });
    await logActivity(ctx, 'deleted', 'api_token', id, `Chave "${t.name}" revogada`);
    revalidatePath('/configuracoes');
    return { message: 'Chave revogada.' };
  });
}

// ---------- Dados de teste ----------
/** Carrega o exemplo Molho Negro (Maringá + Londrina) com ficha técnica e deslocamentos. Idempotente. */
export async function loadMolhoNegroExample() {
  return runAction<{ showIds: string[]; artistId: string }>(async () => {
    const ctx = await requireRole('OWNER');
    const orgId = ctx.org.id;
    let artist = await prisma.artist.findFirst({ where: { organizationId: orgId, slug: MN_EXAMPLE.artistSlug } });
    if (!artist) {
      const c = CASTING_2026.find((x) => slugify(x.name) === MN_EXAMPLE.artistSlug)!;
      const { aliases: _a, ...data } = c;
      void _a;
      artist = await prisma.artist.create({ data: { ...data, slug: MN_EXAMPLE.artistSlug, organizationId: orgId } });
    }
    const showIds: string[] = [];
    for (const ex of MN_EXAMPLE.shows) {
      const date = toCalendarDate(ex.date);
      const fields = { city: ex.city, state: ex.state, venue: ex.venue, venueAddress: ex.venueAddress, production: ex.production, ...(ex.venueTechContact ? { venueTechContact: ex.venueTechContact } : {}) };
      const existing = await prisma.show.findFirst({ where: { organizationId: orgId, artistId: artist.id, date } });
      const show = existing
        ? await prisma.show.update({ where: { id: existing.id }, data: fields })
        : await prisma.show.create({ data: { organizationId: orgId, artistId: artist.id, ownerId: ctx.user.id, date, status: 'CONFIRMED', dealType: 'TBD', ...fields } });
      showIds.push(show.id);
    }
    for (const leg of MN_EXAMPLE.legs) {
      await prisma.travelLeg.deleteMany({ where: { organizationId: orgId, artistId: artist.id, date: leg.date, origin: leg.origin, destination: leg.destination } });
      await prisma.travelLeg.create({ data: { ...leg, organizationId: orgId, artistId: artist.id } });
    }
    await logActivity(ctx, 'imported', 'workbook', null, 'Exemplo Molho Negro (Maringá e Londrina) carregado');
    revalidatePath('/', 'layout');
    return { data: { showIds, artistId: artist.id }, message: 'Exemplo carregado.' };
  });
}
