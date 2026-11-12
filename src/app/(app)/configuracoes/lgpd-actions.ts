'use server';
// LGPD: atendimento a titulares (art. 18), dados do próprio usuário e encarregado(a).
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { logActivity, requireRole } from '@/lib/tenant';
import { formToObject, runAction, UserError } from '@/lib/action';
import { decryptField } from '@/lib/crypto';
import { SESSION_COOKIE } from '@/lib/session';

export interface SubjectHit {
  kind: 'contact' | 'member' | 'showContact' | 'user';
  id: string;
  name: string;
  where: string;
  detail: string | null;
}

/** Busca um titular (nome, e-mail, telefone ou Instagram) em todos os lugares onde a produtora guarda dados pessoais. */
export async function searchDataSubject(q: string) {
  return runAction<SubjectHit[]>(async () => {
    const ctx = await requireRole('ADMIN');
    const term = q.trim();
    if (term.length < 3) throw new UserError('Digite ao menos 3 caracteres.');
    const like = { contains: term, mode: 'insensitive' as const };
    const digits = term.replace(/\D/g, '');
    const [contacts, members, shows, users] = await Promise.all([
      prisma.contact.findMany({ where: { organizationId: ctx.org.id, OR: [{ name: like }, { email: like }, { phone: like }, { instagram: like }, ...(digits.length >= 4 ? [{ phone: { contains: digits.slice(-4) } }] : [])] }, take: 30 }),
      prisma.artistMember.findMany({ where: { artist: { organizationId: ctx.org.id }, OR: [{ name: like }, { email: like }, { phone: like }] }, include: { artist: { select: { name: true } } }, take: 30 }),
      prisma.show.findMany({ where: { organizationId: ctx.org.id, contactName: like }, include: { artist: { select: { name: true } } }, take: 30 }),
      prisma.membership.findMany({ where: { organizationId: ctx.org.id, user: { OR: [{ name: like }, { email: like }] } }, include: { user: true }, take: 10 }),
    ]);
    return {
      data: [
        ...contacts.map((c) => ({ kind: 'contact' as const, id: c.id, name: c.name, where: 'Contratantes', detail: [c.company, c.city].filter(Boolean).join(' · ') || null })),
        ...members.map((m) => ({ kind: 'member' as const, id: m.id, name: m.name, where: `Integrante de ${m.artist.name}`, detail: m.role })),
        ...shows.map((s) => ({ kind: 'showContact' as const, id: s.id, name: s.contactName ?? '', where: `Contato no dia do show de ${s.artist.name}`, detail: `${s.date.toISOString().slice(0, 10)} · ${s.city ?? ''}` })),
        ...users.map((u) => ({ kind: 'user' as const, id: u.user.id, name: u.user.name, where: 'Usuário do sistema', detail: u.user.email })),
      ],
    };
  });
}

/** Exporta tudo o que a produtora guarda sobre o titular (acesso e portabilidade — art. 18, II e V). */
export async function exportDataSubject(kind: SubjectHit['kind'], id: string) {
  return runAction<{ filename: string; json: string }>(async () => {
    const ctx = await requireRole('ADMIN');
    let payload: unknown;
    let name = 'titular';
    if (kind === 'contact') {
      const c = await prisma.contact.findFirst({ where: { id, organizationId: ctx.org.id }, include: { shows: { select: { date: true, venue: true, city: true, artist: { select: { name: true } } } } } });
      if (!c) throw new UserError('Registro não encontrado');
      name = c.name;
      payload = { tipo: 'Contratante', nome: c.name, casa: c.company, cidade: c.city, uf: c.state, telefone: c.phone, email: c.email, instagram: c.instagram, link: c.link, observacoes: c.notes, criado_em: c.createdAt, shows: c.shows };
    } else if (kind === 'member') {
      const m = await prisma.artistMember.findFirst({ where: { id, artist: { organizationId: ctx.org.id } }, include: { artist: { select: { name: true } } } });
      if (!m) throw new UserError('Registro não encontrado');
      name = m.name;
      payload = { tipo: 'Integrante', artista: m.artist.name, nome: m.name, funcao: m.role, nascimento: m.birthDate, rg: decryptField(m.documentRg), cpf: decryptField(m.documentCpf), telefone: m.phone, email: m.email, preferencias_restricoes: m.restrictions, criado_em: m.createdAt };
    } else if (kind === 'showContact') {
      const s = await prisma.show.findFirst({ where: { id, organizationId: ctx.org.id }, include: { artist: { select: { name: true } } } });
      if (!s) throw new UserError('Registro não encontrado');
      name = s.contactName ?? 'contato';
      payload = { tipo: 'Contato no dia do show', contato: s.contactName, show: { data: s.date, artista: s.artist.name, local: s.venue, cidade: s.city } };
    } else {
      const u = await prisma.user.findFirst({ where: { id, memberships: { some: { organizationId: ctx.org.id } } }, select: { name: true, email: true, phone: true, createdAt: true } });
      if (!u) throw new UserError('Registro não encontrado');
      name = u.name;
      payload = { tipo: 'Usuário', ...u };
    }
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: ctx.org.id }, select: { name: true, dpoName: true, dpoEmail: true } });
    await logActivity(ctx, 'exported', 'data_subject', id, `Dados exportados a pedido do titular (${kind})`);
    return {
      data: {
        filename: `dados-${name.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.json`,
        json: JSON.stringify({ controladora: org.name, encarregado: { nome: org.dpoName, email: org.dpoEmail }, gerado_em: new Date().toISOString(), dados: payload }, null, 2),
      },
    };
  });
}

/** Anonimiza o titular (art. 18, IV/VI). Mantém o histórico de shows e valores, sem identificar a pessoa. */
export async function anonymizeDataSubject(kind: SubjectHit['kind'], id: string) {
  return runAction(async () => {
    const ctx = await requireRole('ADMIN');
    if (kind === 'contact') {
      const r = await prisma.contact.updateMany({ where: { id, organizationId: ctx.org.id }, data: { name: 'Contato anonimizado', phone: null, email: null, instagram: null, link: null, notes: null } });
      if (!r.count) throw new UserError('Registro não encontrado');
    } else if (kind === 'member') {
      const m = await prisma.artistMember.findFirst({ where: { id, artist: { organizationId: ctx.org.id } } });
      if (!m) throw new UserError('Registro não encontrado');
      await prisma.artistMember.update({ where: { id }, data: { name: 'Integrante anonimizado', phone: null, email: null, documentRg: null, documentCpf: null, birthDate: null, restrictions: null } });
    } else if (kind === 'showContact') {
      const r = await prisma.show.updateMany({ where: { id, organizationId: ctx.org.id }, data: { contactName: null } });
      if (!r.count) throw new UserError('Registro não encontrado');
    } else {
      throw new UserError('Usuários excluem a própria conta em Meus dados; a administração pode removê-los da equipe.');
    }
    await logActivity(ctx, 'anonymized', 'data_subject', id, `Titular anonimizado (${kind})`);
    revalidatePath('/', 'layout');
    return { message: 'Dados anonimizados.' };
  });
}

/** Encarregado(a) pelo tratamento de dados da produtora (art. 41). */
export async function saveDpo(fd: FormData) {
  return runAction(async () => {
    const ctx = await requireRole('ADMIN');
    const v = z.object({
      dpoName: z.string().trim().max(120).optional().transform((x) => x || null),
      dpoEmail: z.string().trim().max(160).optional().transform((x) => x || null).refine((x) => !x || /\S+@\S+\.\S+/.test(x), 'E-mail inválido'),
    }).parse(formToObject(fd));
    await prisma.organization.update({ where: { id: ctx.org.id }, data: v });
    await logActivity(ctx, 'updated', 'organization', ctx.org.id, 'Encarregado(a) de dados atualizado');
    revalidatePath('/configuracoes');
    return { message: 'Encarregado(a) salvo.' };
  });
}

/** Baixar os próprios dados (acesso e portabilidade). */
export async function exportMyData() {
  return runAction<{ filename: string; json: string }>(async () => {
    const ctx = await requireRole('VIEWER');
    const [user, memberships, tasks, tokens, activity] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { name: true, email: true, phone: true, createdAt: true } }),
      prisma.membership.findMany({ where: { userId: ctx.user.id }, select: { role: true, createdAt: true, organization: { select: { name: true } } } }),
      prisma.task.findMany({ where: { OR: [{ assigneeId: ctx.user.id }, { creatorId: ctx.user.id }] }, select: { title: true, status: true, dueDate: true, createdAt: true } }),
      prisma.apiToken.findMany({ where: { userId: ctx.user.id }, select: { name: true, scope: true, createdAt: true, expiresAt: true, lastUsedAt: true, revokedAt: true } }),
      prisma.activity.findMany({ where: { userId: ctx.user.id }, select: { action: true, entity: true, summary: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 2000 }),
    ]);
    return {
      data: {
        filename: 'meus-dados-greenwaves.json',
        json: JSON.stringify({ gerado_em: new Date().toISOString(), usuario: user, produtoras: memberships, tarefas: tasks, chaves_de_integracao: tokens, atividade: activity }, null, 2),
      },
    };
  });
}

/** Exclusão da própria conta (art. 18, VI). Bloqueia se a pessoa for a única sócia de uma produtora com equipe. */
export async function deleteMyAccount(confirmEmail: string) {
  return runAction(async () => {
    const ctx = await requireRole('VIEWER');
    if (confirmEmail.trim().toLowerCase() !== ctx.user.email.toLowerCase()) throw new UserError('Digite seu e-mail exatamente para confirmar.');
    const owned = await prisma.membership.findMany({ where: { userId: ctx.user.id, role: 'OWNER' }, select: { organizationId: true, organization: { select: { name: true } } } });
    for (const o of owned) {
      const others = await prisma.membership.count({ where: { organizationId: o.organizationId, NOT: { userId: ctx.user.id } } });
      const otherOwners = await prisma.membership.count({ where: { organizationId: o.organizationId, role: 'OWNER', NOT: { userId: ctx.user.id } } });
      if (others > 0 && otherOwners === 0) throw new UserError(`Você é o(a) único(a) sócio(a) de "${o.organization.name}". Promova outra pessoa a sócio(a) antes de excluir sua conta.`);
    }
    // Produtoras em que a pessoa é a única integrante são apagadas junto (com todos os seus dados).
    const solo = await prisma.membership.findMany({ where: { userId: ctx.user.id }, select: { organizationId: true } });
    for (const m of solo) {
      const count = await prisma.membership.count({ where: { organizationId: m.organizationId } });
      if (count === 1) await prisma.organization.delete({ where: { id: m.organizationId } });
    }
    // Registros de atividade e tarefas ficam sem autor (SetNull); chaves e vínculos são apagados em cascata.
    await prisma.user.delete({ where: { id: ctx.user.id } });
    (await cookies()).delete(SESSION_COOKIE);
    return { message: 'Conta excluída.' };
  });
}
