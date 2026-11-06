// Envelope padrão de Server Actions: validação zod, RBAC e erros amigáveis.
import { ZodError } from 'zod';
import { ForbiddenError } from './tenant';

/** Erro de regra de negócio cuja mensagem pode ser exibida ao usuário. */
export class UserError extends Error {}

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function runAction<T>(fn: () => Promise<{ data?: T; message?: string } | void>): Promise<ActionResult<T>> {
  try {
    const r = await fn();
    return { ok: true, ...(r ?? {}) };
  } catch (e) {
    if (e instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of e.issues) fieldErrors[issue.path.join('.')] = issue.message;
      return { ok: false, error: e.issues[0]?.message ?? 'Dados inválidos', fieldErrors };
    }
    if (e instanceof ForbiddenError || e instanceof UserError) return { ok: false, error: e.message };
    if (e && typeof e === 'object' && 'digest' in e) throw e; // redirect()/notFound() do Next
    console.error(e);
    return { ok: false, error: 'Erro inesperado. Tente novamente.' };
  }
}

/** FormData -> objeto plano (checkboxes "on" -> true) */
export function formToObject(fd: FormData): Record<string, string> {
  const o: Record<string, string> = {};
  fd.forEach((v, k) => {
    if (typeof v === 'string') o[k] = v;
  });
  return o;
}
