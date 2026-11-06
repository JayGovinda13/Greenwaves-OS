import { prisma } from '@/lib/db';
import { can, requireContext } from '@/lib/tenant';
import { PageHeader } from '@/components/ui/PageHeader';
import { SettingsView } from '@/components/settings/SettingsView';
import type { Role } from '@/lib/domain';

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
  return (
    <>
      <PageHeader overline={org.name} title="Configurações" subtitle="Dados da produtora, equipe e permissões, importação de planilhas e sua conta." />
      <SettingsView
        org={{ name: org.name, email: org.email, phone: org.phone, instagram: org.instagram, city: org.city, plan: org.plan, slug: org.slug }}
        members={members.map((m) => ({ id: m.id, role: m.role as Role, name: m.user.name, email: m.user.email, isMe: m.user.id === ctx.user.id }))}
        myRole={ctx.role}
        canAdmin={can(ctx, 'ADMIN')}
      />
    </>
  );
}
