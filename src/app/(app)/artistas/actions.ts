'use server';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { can, logActivity, requireRole } from '@/lib/tenant';
import { formToObject, runAction, UserError } from '@/lib/action';
import { artistSchema, memberSchema } from '@/lib/domain';
import { techRiderSchema } from '@/lib/techRider';
import { decryptField, encryptField } from '@/lib/crypto';
import { slugify, toCalendarDate } from '@/lib/format';

export async function saveArtist(id: string | null, fd: FormData) {
  return runAction<{ id: string }>(async () => {
    const ctx = await requireRole('ADMIN');
    const raw = formToObject(fd);
    const input = artistSchema.parse({ ...raw, active: raw.active !== 'false' });
    const slug = slugify(input.name);
    const clash = await prisma.artist.findFirst({ where: { organizationId: ctx.org.id, slug, NOT: id ? { id } : undefined }, select: { id: true } });
    if (clash) throw new UserError('Já existe um artista com esse nome.');
    let artistId = id;
    if (id) {
      const r = await prisma.artist.updateMany({ where: { id, organizationId: ctx.org.id }, data: { ...input, slug } });
      if (!r.count) throw new UserError('Artista não encontrado');
    } else {
      artistId = (await prisma.artist.create({ data: { ...input, slug, organizationId: ctx.org.id } })).id;
    }
    await logActivity(ctx, id ? 'updated' : 'created', 'artist', artistId, input.name);
    revalidatePath('/artistas');
    return { data: { id: artistId! }, message: id ? 'Artista atualizado.' : 'Artista adicionado ao casting.' };
  });
}

export async function deleteArtist(id: string) {
  const r = await runAction(async () => {
    const ctx = await requireRole('OWNER');
    const a = await prisma.artist.findFirst({ where: { id, organizationId: ctx.org.id } });
    if (!a) throw new UserError('Artista não encontrado');
    await prisma.artist.delete({ where: { id } });
    await logActivity(ctx, 'deleted', 'artist', id, a.name);
    revalidatePath('/artistas');
  });
  if (r.ok) redirect('/artistas');
  return r;
}

async function ownedArtist(orgId: string, artistId: string) {
  const a = await prisma.artist.findFirst({ where: { id: artistId, organizationId: orgId }, select: { id: true, name: true } });
  if (!a) throw new UserError('Artista não encontrado');
  return a;
}

export async function saveMember(artistId: string, memberId: string | null, fd: FormData) {
  return runAction(async () => {
    const ctx = await requireRole('PRODUCER');
    const artist = await ownedArtist(ctx.org.id, artistId);
    const input = memberSchema.parse(formToObject(fd));
    const { documentRg, documentCpf, birthDate, ...rest } = input;
    // Documentos e nascimento: só a administração grava; campo vazio = manter o valor atual. RG/CPF cifrados (LGPD art. 46).
    const docs: Record<string, unknown> = {};
    if (can(ctx, 'ADMIN')) {
      if (documentRg) docs.documentRg = encryptField(documentRg);
      if (documentCpf) docs.documentCpf = encryptField(documentCpf);
      if (birthDate) docs.birthDate = toCalendarDate(birthDate);
    }
    const data = { ...rest, ...docs };
    if (memberId) {
      const r = await prisma.artistMember.updateMany({ where: { id: memberId, artistId }, data });
      if (!r.count) throw new UserError('Integrante não encontrado');
    } else await prisma.artistMember.create({ data: { ...data, artistId } });
    await logActivity(ctx, memberId ? 'updated' : 'created', 'member', artistId, `${input.name} (${artist.name})`);
    revalidatePath(`/artistas/${artistId}`);
    return { message: 'Integrante salvo.' };
  });
}

export async function deleteMember(artistId: string, memberId: string) {
  return runAction(async () => {
    const ctx = await requireRole('ADMIN');
    await ownedArtist(ctx.org.id, artistId);
    await prisma.artistMember.deleteMany({ where: { id: memberId, artistId } });
    revalidatePath(`/artistas/${artistId}`);
    return { message: 'Integrante removido.' };
  });
}

/** Salva o modelo de ficha técnica (e mapa de palco) do artista. */
export async function saveArtistTechRider(artistId: string, data: unknown) {
  return runAction(async () => {
    // equipe (produção+) ou a própria banda pelo portal
    const ctx = await requireRole('ARTIST');
    if (ctx.role === 'ARTIST' ? ctx.artistId !== artistId : !can(ctx, 'PRODUCER')) throw new UserError('Você não tem permissão para esta ação.');
    const artist = await ownedArtist(ctx.org.id, artistId);
    const rider = techRiderSchema.parse(data);
    await prisma.artist.update({ where: { id: artistId }, data: { techRider: rider } });
    await logActivity(ctx, 'updated', 'artist', artistId, `Ficha técnica de ${artist.name}`);
    revalidatePath(`/artistas/${artistId}`);
    return { message: 'Ficha técnica salva.' };
  });
}

/** Revela RG/CPF de um integrante para a administração. Cada visualização fica registrada (LGPD art. 37). */
export async function revealMemberDocs(artistId: string, memberId: string) {
  return runAction<{ rg: string | null; cpf: string | null; birthDate: string | null }>(async () => {
    const ctx = await requireRole('ADMIN');
    const artist = await ownedArtist(ctx.org.id, artistId);
    const m = await prisma.artistMember.findFirst({ where: { id: memberId, artistId } });
    if (!m) throw new UserError('Integrante não encontrado');
    await logActivity(ctx, 'viewed', 'member_docs', memberId, `Documentos de ${m.name} (${artist.name}) visualizados`);
    return { data: { rg: decryptField(m.documentRg), cpf: decryptField(m.documentCpf), birthDate: m.birthDate?.toISOString().slice(0, 10) ?? null } };
  });
}

// ---------- Portal da banda ----------
const bandInviteSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome'),
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
});

/** Dá acesso ao portal da banda (papel ARTIST, restrito a este artista). Mostra a senha temporária uma vez. */
export async function inviteBandUser(artistId: string, fd: FormData) {
  return runAction<{ tempPassword?: string }>(async () => {
    const ctx = await requireRole('ADMIN');
    const artist = await ownedArtist(ctx.org.id, artistId);
    const input = bandInviteSchema.parse(formToObject(fd));
    let user = await prisma.user.findUnique({ where: { email: input.email } });
    let tempPassword: string | undefined;
    if (!user) {
      tempPassword = crypto.randomBytes(6).toString('base64url');
      user = await prisma.user.create({ data: { name: input.name, email: input.email, passwordHash: await bcrypt.hash(tempPassword, 10) } });
    }
    const existing = await prisma.membership.findUnique({ where: { userId_organizationId: { userId: user.id, organizationId: ctx.org.id } } });
    if (existing) throw new UserError(existing.role === 'ARTIST' ? 'Essa pessoa já tem acesso ao portal de uma banda.' : 'Essa pessoa já faz parte da equipe da produtora.');
    await prisma.membership.create({ data: { userId: user.id, organizationId: ctx.org.id, role: 'ARTIST', artistId } });
    await logActivity(ctx, 'created', 'band_access', user.id, `Acesso ao portal: ${input.name} (${artist.name})`);
    revalidatePath(`/artistas/${artistId}`);
    return { data: { tempPassword }, message: 'Acesso criado.' };
  });
}

export async function removeBandUser(artistId: string, membershipId: string) {
  return runAction(async () => {
    const ctx = await requireRole('ADMIN');
    const m = await prisma.membership.findFirst({ where: { id: membershipId, organizationId: ctx.org.id, role: 'ARTIST', artistId }, include: { user: true } });
    if (!m) throw new UserError('Acesso não encontrado');
    await prisma.membership.delete({ where: { id: m.id } });
    await logActivity(ctx, 'deleted', 'band_access', m.userId, `Acesso ao portal removido: ${m.user.name}`);
    revalidatePath(`/artistas/${artistId}`);
    return { message: 'Acesso removido.' };
  });
}
