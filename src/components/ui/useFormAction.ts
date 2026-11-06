'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './Toast';
import type { ActionResult } from '@/lib/action';

/** Submete um FormData para uma Server Action, exibe toast e expõe erros por campo. */
export function useFormAction<T>(action: (fd: FormData) => Promise<ActionResult<T>>, onSuccess?: (data?: T) => void) {
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const toast = useToast();
  const router = useRouter();
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await action(fd);
      if (r.ok) {
        setErrors({});
        toast(r.message ?? 'Salvo.');
        onSuccess?.(r.data);
        router.refresh();
      } else {
        setErrors(r.fieldErrors ?? {});
        toast(r.error, 'error');
      }
    });
  };
  const err = (name: string) => (errors[name] ? { error: true, helperText: errors[name] } : {});
  return { submit, pending, err, setErrors };
}
