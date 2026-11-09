import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getContext } from '@/lib/tenant';
import { buildImportTemplate } from '@/lib/importers/template';

export const dynamic = 'force-dynamic';

/** Modelo .xlsx para importação, já com a lista de artistas da produtora nas listas suspensas. */
export async function GET() {
  const ctx = await getContext();
  if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const artists = await prisma.artist.findMany({
    where: { organizationId: ctx.org.id },
    select: { name: true },
    orderBy: { name: 'asc' },
  });
  const file = await buildImportTemplate(artists.map((a) => a.name));
  return new NextResponse(new Uint8Array(file), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      // Nome só em ASCII: alguns navegadores ignoram o filename* codificado
      'Content-Disposition': 'attachment; filename="Modelo de importacao - Greenwaves OS.xlsx"',
      'Cache-Control': 'no-store',
    },
  });
}
