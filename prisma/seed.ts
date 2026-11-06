/**
 * Seed: cria a organização Green Wave, usuários sócios, o Casting 2026 e importa os shows.
 * - Se existir data/greenwave.xlsx (não versionado), importa a planilha completa (inclui dados das bandas).
 * - Senão, usa prisma/data/seed-workbook.json (versão sanitizada, sem dados pessoais).
 */
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { CASTING_2026 } from './data/casting';
import { importIntoOrganization, parseGreenWaveWorkbook, type ImportedWorkbook } from '../src/lib/importers/greenwave-xlsx';
import { slugify } from '../src/lib/format';

const prisma = new PrismaClient();
const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? 'greenwave2026';

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: 'green-wave' },
    update: {},
    create: {
      name: 'Green Wave',
      slug: 'green-wave',
      plan: 'PRO',
      email: 'carol.folha@gmail.com',
      instagram: 'green.wave.music',
      city: 'São Paulo',
    },
  });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const people = [
    { name: 'Carol Folha', email: 'carol@greenwave.music', role: 'OWNER' },
    { name: 'Arnilha', email: 'arnilha@greenwave.music', role: 'OWNER' },
    { name: 'Produção Green Wave', email: 'producao@greenwave.music', role: 'PRODUCER' },
  ];
  for (const p of people) {
    const user = await prisma.user.upsert({ where: { email: p.email }, update: {}, create: { name: p.name, email: p.email, passwordHash } });
    await prisma.membership.upsert({
      where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
      update: { role: p.role },
      create: { userId: user.id, organizationId: org.id, role: p.role },
    });
  }

  for (const a of CASTING_2026) {
    const { aliases: _aliases, ...data } = a;
    void _aliases;
    await prisma.artist.upsert({
      where: { organizationId_slug: { organizationId: org.id, slug: slugify(a.name) } },
      update: data,
      create: { ...data, slug: slugify(a.name), organizationId: org.id },
    });
  }

  const xlsx = 'data/greenwave.xlsx';
  let workbook: ImportedWorkbook;
  if (existsSync(xlsx)) {
    console.log(`Importando planilha completa de ${xlsx}`);
    workbook = await parseGreenWaveWorkbook(await readFile(xlsx));
  } else {
    console.log('Importando seed sanitizado (prisma/data/seed-workbook.json)');
    workbook = JSON.parse(await readFile('prisma/data/seed-workbook.json', 'utf8'));
  }
  const summary = await importIntoOrganization(prisma, org.id, workbook);
  console.table(summary);

  // Recebíveis derivados dos combinados com cachê definido (um lançamento por show, idempotente)
  const shows = await prisma.show.findMany({
    where: { organizationId: org.id, fee: { not: null }, transactions: { none: {} } },
    include: { artist: { select: { name: true } } },
  });
  const startOfToday = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z');
  for (const s of shows) {
    await prisma.transaction.create({
      data: {
        organizationId: org.id,
        showId: s.id,
        artistId: s.artistId,
        type: 'INCOME',
        category: 'FEE',
        description: `Cachê ${s.artist.name} — ${s.venue ?? s.city ?? 'show'}`,
        amount: s.fee!,
        date: s.date,
        dueDate: s.date,
        status: s.date < startOfToday ? 'PAID' : 'PENDING',
        method: 'PIX',
      },
    });
  }
  console.log(`${shows.length} lançamentos de cachê criados.`);
  console.log(`\nLogin: carol@greenwave.music / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
