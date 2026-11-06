'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { can, logActivity, requireRole } from '@/lib/tenant';
import { formToObject, runAction, UserError } from '@/lib/action';
import { artistSchema, memberSchema } from '@/lib/domain';
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
    const { documentRg, documentCpf, ...rest } = input;
    // Documentos (RG/CPF) só podem ser lidos/alterados por administração
    const docs = can(ctx, 'ADMIN') ? { documentRg, documentCpf } : {};
    const data = { ...rest, ...docs, birthDate: input.birthDate ? toCalendarDate(input.birthDate) : null };
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
