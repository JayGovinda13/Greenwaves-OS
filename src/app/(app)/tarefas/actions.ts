'use server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { can, logActivity, requireRole } from '@/lib/tenant';
import { formToObject, runAction, UserError } from '@/lib/action';
import { taskSchema } from '@/lib/domain';
import { fmtDate, toCalendarDate } from '@/lib/format';

export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  completedAt: string | null;
  assignee: { id: string; name: string } | null;
  creator: { id: string; name: string } | null;
  show: { id: string; label: string } | null;
  canDelete: boolean;
}

export interface TasksPanelData {
  me: string;
  canCreate: boolean;
  members: { id: string; name: string }[];
  shows: { id: string; label: string }[];
  tasks: TaskItem[];
}

/** Dados do painel de tarefas: tarefas em que participo (responsável ou criador). */
export async function getTasksPanel() {
  return runAction<TasksPanelData>(async () => {
    const ctx = await requireRole('VIEWER');
    const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
    const [members, shows, tasks] = await Promise.all([
      prisma.membership.findMany({
        where: { organizationId: ctx.org.id },
        select: { user: { select: { id: true, name: true } } },
        orderBy: { user: { name: 'asc' } },
      }),
      prisma.show.findMany({
        where: { organizationId: ctx.org.id, status: { not: 'CANCELED' }, date: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) } },
        select: { id: true, date: true, city: true, venue: true, artist: { select: { name: true } } },
        orderBy: { date: 'asc' },
        take: 200,
      }),
      prisma.task.findMany({
        where: {
          organizationId: ctx.org.id,
          OR: [{ assigneeId: ctx.user.id }, { creatorId: ctx.user.id }],
          AND: [{ OR: [{ status: 'TODO' }, { completedAt: { gte: since } }] }],
        },
        include: {
          assignee: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true } },
          show: { select: { id: true, date: true, city: true, artist: { select: { name: true } } } },
        },
        orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
      }),
    ]);
    const isAdmin = can(ctx, 'ADMIN');
    return {
      data: {
        me: ctx.user.id,
        canCreate: can(ctx, 'PRODUCER'),
        members: members.map((m) => m.user),
        shows: shows.map((s) => ({
          id: s.id,
          label: [fmtDate(s.date, 'DD/MM'), s.artist.name, [s.city, s.venue && `(${s.venue})`].filter(Boolean).join(' ')].filter(Boolean).join(' · '),
        })),
        tasks: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate?.toISOString() ?? null,
          completedAt: t.completedAt?.toISOString() ?? null,
          assignee: t.assignee,
          creator: t.creator,
          show: t.show ? { id: t.show.id, label: `${fmtDate(t.show.date, 'DD/MM')} · ${t.show.artist.name} · ${t.show.city ?? ''}` } : null,
          canDelete: isAdmin || t.creatorId === ctx.user.id,
        })),
      },
    };
  });
}

export async function createTask(fd: FormData) {
  return runAction(async () => {
    const ctx = await requireRole('PRODUCER');
    const input = taskSchema.parse(formToObject(fd));
    const member = await prisma.membership.findFirst({
      where: { organizationId: ctx.org.id, userId: input.assigneeId },
      select: { user: { select: { name: true } } },
    });
    if (!member) throw new UserError('Responsável não faz parte da equipe.');
    if (input.showId && !(await prisma.show.findFirst({ where: { id: input.showId, organizationId: ctx.org.id }, select: { id: true } })))
      throw new UserError('Show inválido');
    const task = await prisma.task.create({
      data: {
        organizationId: ctx.org.id,
        creatorId: ctx.user.id,
        title: input.title,
        description: input.description,
        assigneeId: input.assigneeId,
        priority: input.priority,
        dueDate: input.dueDate ? toCalendarDate(input.dueDate) : null,
        showId: input.showId,
      },
    });
    const delegated = input.assigneeId !== ctx.user.id;
    await logActivity(ctx, 'created', 'task', task.id, delegated ? `${input.title} → ${member.user.name}` : input.title);
    revalidatePath('/', 'layout');
    return { message: delegated ? `Tarefa delegada para ${member.user.name}.` : 'Tarefa criada.' };
  });
}

export async function toggleTask(id: string, done: boolean) {
  return runAction(async () => {
    const ctx = await requireRole('VIEWER');
    const task = await prisma.task.findFirst({ where: { id, organizationId: ctx.org.id } });
    if (!task) throw new UserError('Tarefa não encontrada');
    // Conclui quem é responsável, quem criou ou a administração
    if (task.assigneeId !== ctx.user.id && task.creatorId !== ctx.user.id && !can(ctx, 'ADMIN'))
      throw new UserError('Só o responsável ou quem criou pode concluir esta tarefa.');
    await prisma.task.update({
      where: { id },
      data: { status: done ? 'DONE' : 'TODO', completedAt: done ? new Date() : null },
    });
    if (done) await logActivity(ctx, 'completed', 'task', id, task.title);
    revalidatePath('/', 'layout');
  });
}

export async function deleteTask(id: string) {
  return runAction(async () => {
    const ctx = await requireRole('PRODUCER');
    const task = await prisma.task.findFirst({ where: { id, organizationId: ctx.org.id } });
    if (!task) throw new UserError('Tarefa não encontrada');
    if (task.creatorId !== ctx.user.id && !can(ctx, 'ADMIN')) throw new UserError('Só quem criou pode excluir esta tarefa.');
    await prisma.task.delete({ where: { id } });
    await logActivity(ctx, 'deleted', 'task', id, task.title);
    revalidatePath('/', 'layout');
    return { message: 'Tarefa excluída.' };
  });
}

/** Delega (ou redelega) uma tarefa existente para outra pessoa da equipe. */
export async function reassignTask(id: string, assigneeId: string) {
  return runAction(async () => {
    const ctx = await requireRole('PRODUCER');
    const task = await prisma.task.findFirst({ where: { id, organizationId: ctx.org.id } });
    if (!task) throw new UserError('Tarefa não encontrada');
    if (task.assigneeId !== ctx.user.id && task.creatorId !== ctx.user.id && !can(ctx, 'ADMIN'))
      throw new UserError('Só o responsável ou quem criou pode delegar esta tarefa.');
    const member = await prisma.membership.findFirst({
      where: { organizationId: ctx.org.id, userId: assigneeId },
      select: { user: { select: { name: true } } },
    });
    if (!member) throw new UserError('Essa pessoa não faz parte da equipe.');
    await prisma.task.update({ where: { id }, data: { assigneeId } });
    await logActivity(ctx, 'delegated', 'task', id, `${task.title} → ${member.user.name}`);
    revalidatePath('/', 'layout');
    return { message: `Tarefa delegada para ${member.user.name}.` };
  });
}
