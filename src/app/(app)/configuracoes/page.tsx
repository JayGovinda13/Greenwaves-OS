import Box from '@mui/material/Box';
import { prisma } from '@/lib/db';
import { can, requireContext } from '@/lib/tenant';
import { PageHeader } from '@/components/ui/PageHeader';
import { SettingsView } from '@/components/settings/SettingsView';
import type { Role } from '@/lib/domain';
import { headers } from 'next/headers';
import { AiIntegrationSection } from '@/components/settings/AiIntegrationSection';
import { fmtDate } from '@/lib/format';

export const metadata = { title: 'Configurações' };

export default async function SettingsPage() {
  const ctx = await requireContext();
  const [org, members] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: ctx.org.id } }),
    prisma.membership.findMany({
      where: { organizationId: ctx.org.id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    }),
  ]);
  const isAdmin = can(ctx, 'ADMIN');
  const [tokens, logs, enabledBy] = await Promise.all([
    prisma.apiToken.findMany({
      where: { organizationId: ctx.org.id, ...(isAdmin ? {} : { userId: ctx.user.id }) },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.mcpAuditLog.findMany({
      where: { organizationId: ctx.org.id, ...(isAdmin ? {} : { userId: ctx.user.id }) },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
    org.aiEnabledById ? prisma.user.findUnique({ where: { id: org.aiEnabledById }, select: { name: true } }) : null,
  ]);
  const h = await headers();
  const appUrl = process.env.APP_URL?.replace(/\/$/, '') || `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`;

  return (
    <>
      <PageHeader overline={org.name} title="Configurações" subtitle="Dados da produtora, equipe e permissões, importação de planilhas e sua conta." />
      <SettingsView
        org={{ name: org.name, email: org.email, phone: org.phone, instagram: org.instagram, city: org.city, plan: org.plan, slug: org.slug }}
        members={members.map((m) => ({ id: m.id, role: m.role as Role, name: m.user.name, email: m.user.email, isMe: m.user.id === ctx.user.id }))}
        myRole={ctx.role}
        canAdmin={can(ctx, 'ADMIN')}
      />
      <Box sx={{ mt: 3, display: 'grid' }}>
        <AiIntegrationSection
          enabled={org.aiEnabled}
          enabledInfo={org.aiEnabled && org.aiEnabledAt ? `Ativada em ${fmtDate(org.aiEnabledAt)}${enabledBy ? ` por ${enabledBy.name}` : ''}.` : null}
          isOwner={ctx.role === 'OWNER'}
          canWrite={can(ctx, 'PRODUCER')}
          isAdmin={isAdmin}
          mcpUrl={`${appUrl}/api/mcp`}
          tokens={tokens.map((t) => ({
            id: t.id, name: t.name, prefix: t.prefix, scope: t.scope, owner: t.user.name, mine: t.userId === ctx.user.id,
            createdAt: t.createdAt.toISOString(), expiresAt: t.expiresAt.toISOString(), lastUsedAt: t.lastUsedAt?.toISOString() ?? null, revokedAt: t.revokedAt?.toISOString() ?? null,
          }))}
          logs={logs.map((l) => ({ id: l.id, at: l.createdAt.toISOString(), user: l.user?.name ?? null, tool: l.tool, ok: l.ok, summary: l.summary, personalData: l.personalData }))}
        />
      </Box>
    </>
  );
}
