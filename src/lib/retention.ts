// Eliminação automática de registros após o prazo de retenção (LGPD art. 15/16).
import 'server-only';
import { prisma } from './db';
import { RETENTION } from './legal';

const DAY = 24 * 3600 * 1000;

export async function purgeExpired() {
  const now = Date.now();
  await Promise.all([
    prisma.activity.deleteMany({ where: { createdAt: { lt: new Date(now - RETENTION.activityMonths * 30 * DAY) } } }),
    prisma.mcpAuditLog.deleteMany({ where: { createdAt: { lt: new Date(now - RETENTION.mcpLogDays * DAY) } } }),
    prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: new Date(now - RETENTION.loginAttemptDays * DAY) } } }),
  ]);
}

/** Roda a limpeza de vez em quando, sem pesar nas requisições. */
export function maybePurge() {
  if (Math.random() < 0.03) purgeExpired().catch((e) => console.error('[retention]', e));
}
