'use server';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { SESSION_COOKIE, sessionCookieOptions, signSession } from '@/lib/session';
import { slugify } from '@/lib/format';
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

export async function login(_: AuthState, fd: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0]!.message, values: keep(fd) };
  const { email, password, next } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { orderBy: { createdAt: 'asc' }, take: 1 } },
  });
  // compara mesmo sem usuário para não vazar por timing quais e-mails existem
  const ok = await bcrypt.compare(password, user?.passwordHash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva');
  if (!user || !ok || !user.memberships[0]) return { error: 'E-mail ou senha incorretos.', values: keep(fd) };
  const token = await signSession({ uid: user.id, oid: user.memberships[0].organizationId });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
  redirect(next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard');
}

const signupSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome'),
  orgName: z.string().trim().min(2, 'Informe o nome da produtora'),
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  password: z.string().min(8, 'A senha precisa ter ao menos 8 caracteres'),
});

export async function signup(_: AuthState, fd: FormData): Promise<AuthState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0]!.message, values: keep(fd) };
  const { name, orgName, email, password } = parsed.data;
  if (await prisma.user.findUnique({ where: { email } })) return { error: 'Já existe uma conta com este e-mail.', values: keep(fd) };

  let slug = slugify(orgName) || 'produtora';
  if (await prisma.organization.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      memberships: { create: { role: 'OWNER', organization: { create: { name: orgName, slug, email } } } },
    },
    include: { memberships: true },
  });
  const token = await signSession({ uid: user.id, oid: user.memberships[0]!.organizationId });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
  redirect('/dashboard');
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
