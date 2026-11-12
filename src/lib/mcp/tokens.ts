// Chaves pessoais de acesso do conector MCP (Claude).
import 'server-only';
import crypto from 'node:crypto';
import { prisma } from '../db';
import type { Role } from '../domain';

export const TOKEN_PREFIX = 'gwos_';
export const TOKEN_TTL_DAYS = [30, 90, 180] as const;
/** Limite de chamadas por chave por minuto (proteção contra abuso). */
export const RATE_LIMIT_PER_MINUTE = 120;
/** Retenção do registro de operações (LGPD: necessidade/minimização). */
export const AUDIT_RETENTION_DAYS = 180;

export function generateToken() {
  const token = TOKEN_PREFIX + crypto.randomBytes(32).toString('base64url');
  return { token, hash: hashToken(token), prefix: token.slice(0, TOKEN_PREFIX.length + 6) };
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export interface McpContext {
  tokenId: string;
  scope: 'READ' | 'WRITE';
  role: Role;
  user: { id: string; name: string; email: string };
  org: { id: string; name: string; slug: string; plan: string };
}

export type AuthFailure = { status: 401 | 403 | 429; message: string };

/** Valida a chave do cabeçalho Authorization: Bearer gwos_… */
export async function authenticate(header: string | null): Promise<McpContext | AuthFailure> {
  const token = header?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token || !token.startsWith(TOKEN_PREFIX)) return { status: 401, message: 'Chave de acesso ausente. Gere uma em Configurações → Integração com Claude.' };

  const row = await prisma.apiToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: { select: { id: true, name: true, email: true } },
      organization: { select: { id: true, name: true, slug: true, plan: true, aiEnabled: true } },
    },
  });
  if (!row || row.revokedAt) return { status: 401, message: 'Chave inválida ou revogada.' };
  if (row.expiresAt < new Date()) return { status: 401, message: 'Chave expirada. Gere uma nova em Configurações.' };
  if (!row.organization.aiEnabled) return { status: 403, message: 'A integração com IA está desativada nesta produtora.' };

  // O papel vale como está hoje (se a pessoa saiu da equipe, a chave deixa de funcionar)
  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: row.userId, organizationId: row.organizationId } },
    select: { role: true },
  });
  if (!membership) return { status: 403, message: 'Você não faz mais parte desta produtora.' };

  const recent = await prisma.mcpAuditLog.count({ where: { tokenId: row.id, createdAt: { gte: new Date(Date.now() - 60_000) } } });
  if (recent >= RATE_LIMIT_PER_MINUTE) return { status: 429, message: 'Muitas solicitações. Aguarde um minuto.' };

  await prisma.apiToken.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } });
  const { aiEnabled: _ai, ...org } = row.organization;
  void _ai;
  return { tokenId: row.id, scope: row.scope as 'READ' | 'WRITE', role: membership.role as Role, user: row.user, org };
}

export function isFailure(x: McpContext | AuthFailure): x is AuthFailure {
  return 'status' in x;
}

/** Registra a operação e, de vez em quando, apaga registros mais antigos que o prazo de retenção. */
export async function audit(ctx: McpContext, tool: string, ok: boolean, summary?: string, personalData = false) {
  await prisma.mcpAuditLog.create({
    data: { organizationId: ctx.org.id, userId: ctx.user.id, tokenId: ctx.tokenId, tool, ok, summary: summary?.slice(0, 300), personalData },
  });
  if (Math.random() < 0.02) {
    await prisma.mcpAuditLog.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - AUDIT_RETENTION_DAYS * 24 * 3600 * 1000) } } });
  }
}
