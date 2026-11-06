import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Diagnóstico de deploy: indica se a configuração essencial está presente (sem expor valores). */
export async function GET() {
  const authSecret = (process.env.AUTH_SECRET?.length ?? 0) >= 16;
  const databaseUrl = !!process.env.DATABASE_URL;
  let database: 'ok' | 'sem tabelas' | 'inacessível' = 'inacessível';
  let organizations: number | null = null;
  if (databaseUrl) {
    try {
      organizations = await prisma.organization.count();
      database = 'ok';
    } catch (e) {
      database = String(e).includes('does not exist') ? 'sem tabelas' : 'inacessível';
    }
  }
  const ok = authSecret && database === 'ok';
  return NextResponse.json({ ok, authSecret, databaseUrl, database, organizations }, { status: ok ? 200 : 503 });
}
