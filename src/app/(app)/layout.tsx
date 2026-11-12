import { requireStaff } from '@/lib/tenant';
import { prisma } from '@/lib/db';
import { maybePurge } from '@/lib/retention';
import { AppShell } from '@/components/layout/AppShell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireStaff();
  maybePurge();
  const openTasks = await prisma.task.count({
    where: { organizationId: ctx.org.id, assigneeId: ctx.user.id, status: 'TODO' },
  });
  return (
    <AppShell user={ctx.user} org={ctx.org} role={ctx.role} orgs={ctx.orgs} openTasks={openTasks}>
      {children}
    </AppShell>
  );
}
