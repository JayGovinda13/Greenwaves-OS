// Contexto do tenant: usuário autenticado + organização ativa + papel (RBAC).
import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from './db';
import { SESSION_COOKIE, verifySession } from './session';
import { ROLE_RANK, type Role } from './domain';

export interface TenantContext {
  user: { id: string; name: string; email: string };
  org: { id: string; name: string; slug: string; plan: string };
  role: Role;
  orgs: { id: string; name: string; role: Role }[];
}

export class ForbiddenError extends Error {
  constructor(message = 'Você não tem permissão para esta ação.') {
    super(message);
  }
}

export const getContext = cache(async (): Promise<TenantContext | null> => {
  const jar = await cookies();
  const session = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.uid },
    select: {
      id: true,
      name: true,
      email: true,
      memberships: { select: { role: true, organization: { select: { id: true, name: true, slug: true, plan: true } } } },
    },
  });
  if (!user || user.memberships.length === 0) return null;
  const active = user.memberships.find((m) => m.organization.id === session.oid) ?? user.memberships[0]!;
  return {
    user: { id: user.id, name: user.name, email: user.email },
    org: active.organization,
    role: active.role as Role,
    orgs: user.memberships.map((m) => ({ id: m.organization.id, name: m.organization.name, role: m.role as Role })),
  };
});

/** Para Server Components: redireciona ao login se não autenticado. */
export async function requireContext(): Promise<TenantContext> {
  const ctx = await getContext();
  if (!ctx) redirect('/login');
  return ctx;
}

export function can(ctx: TenantContext, min: Role): boolean {
  return ROLE_RANK[ctx.role] >= ROLE_RANK[min];
}

/** Para Server Actions: lança erro se não autenticado ou sem papel mínimo. */
export async function requireRole(min: Role): Promise<TenantContext> {
  const ctx = await getContext();
  if (!ctx) throw new ForbiddenError('Sessão expirada. Entre novamente.');
  if (!can(ctx, min)) throw new ForbiddenError();
  return ctx;
}

export async function logActivity(
  ctx: TenantContext,
  action: string,
  entity: string,
  entityId: string | null,
  summary: string,
) {
  await prisma.activity.create({
    data: { organizationId: ctx.org.id, userId: ctx.user.id, action, entity, entityId, summary },
  });
}
