'use client';
import { useRouter } from 'next/navigation';

export function PrintToolbar({ backHref, toggles }: { backHref: string; toggles?: { label: string; href: string; active: boolean }[] }) {
  const router = useRouter();
  return (
    <div className="gw-toolbar">
      <button onClick={() => (window.history.length > 1 ? router.back() : router.push(backHref))}>← Voltar</button>
      {toggles?.map((t) => (
        <a key={t.label} href={t.href} style={t.active ? { background: 'rgba(255,247,234,.15)' } : undefined}>
          {t.active ? '☑' : '☐'} {t.label}
        </a>
      ))}
      <button className="primary" onClick={() => window.print()}>Imprimir / Salvar PDF</button>
    </div>
  );
}
