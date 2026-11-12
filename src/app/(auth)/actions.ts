'use server';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { SESSION_COOKIE, sessionCookieOptions, signSession } from '@/lib/session';
import { getContext } from '@/lib/tenant';

export type AuthState = { error?: string; values?: Record<string, string> } | undefined;

/** Devolve os campos não sensíveis para repopular o formulário (React 19 reseta o form após a action). */
function keep(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of ['email', 'name', 'orgName']) {
    const v = fd.get(k);
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
  next: z.string().optional(),
});

const CONFIG_ERROR = 'Servidor sem configuração: verifique DATABASE_URL e AUTH_SECRET (veja /api/health).';

export async function login(state: AuthState, fd: FormData): Promise<AuthState> {
  try {
    return await doLogin(state, fd);
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e; // redirect()
    console.error('[login]', e);
    return { error: CONFIG_ERROR, values: keep(fd) };
  }
}

async function doLogin(_: AuthState, fd: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0]!.message, values: keep(fd) };
  const { email, password, next } = parsed.data;
  // Proteção contra força bruta (LGPD art. 46): 8 falhas em 15 minutos bloqueiam o e-mail temporariamente
  const emailHash = crypto.createHash('sha256').update(email).digest('hex');
  const recentFails = await prisma.loginAttempt.count({ where: { emailHash, createdAt: { gte: new Date(Date.now() - 15 * 60_000) } } });
  if (recentFails >= 8) return { error: 'Muitas tentativas seguidas. Aguarde 15 minutos e tente de novo.', values: keep(fd) };
  const user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { orderBy: { createdAt: 'asc' }, take: 1 } },
  });
  // compara mesmo sem usuário para não vazar por timing quais e-mails existem
  const ok = await bcrypt.compare(password, user?.passwordHash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva');
  if (!user || !ok || !user.memberships[0]) {
    const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
    await prisma.loginAttempt.create({ data: { emailHash, ip } });
    return { error: 'E-mail ou senha incorretos.', values: keep(fd) };
  }
  await prisma.loginAttempt.deleteMany({ where: { emailHash } });
  const token = await signSession({ uid: user.id, oid: user.memberships[0].organizationId });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
  redirect(next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard');
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect('/login');
}

export async function switchOrganization(orgId: string) {
  const ctx = await getContext();
  if (!ctx || !ctx.orgs.some((o) => o.id === orgId)) return;
  const token = await signSession({ uid: ctx.user.id, oid: orgId });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
  redirect('/dashboard');
}
