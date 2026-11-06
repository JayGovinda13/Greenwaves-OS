import { requireContext } from '@/lib/tenant';
import { AppShell } from '@/components/layout/AppShell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireContext();
  return (
    <AppShell user={ctx.user} org={ctx.org} role={ctx.role} orgs={ctx.orgs}>
      {children}
    </AppShell>
  );
}
