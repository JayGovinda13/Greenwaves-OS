/**
 * Importa a planilha "Green Wave - Geral.xlsx" para uma organização.
 *
 *   npm run import:xlsx -- data/greenwave.xlsx [--org green-wave]
 *   npm run import:xlsx -- data/greenwave.xlsx --export-sanitized prisma/data/seed-workbook.json
 *
 * --export-sanitized gera um JSON sem dados pessoais (RG/CPF/telefones/e-mails) usado pelo seed versionado.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { importIntoOrganization, parseGreenWaveWorkbook, sanitizeWorkbook } from '../src/lib/importers/greenwave-xlsx';

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  if (!file) throw new Error('Informe o caminho da planilha .xlsx');
  const flag = (name: string) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const parsed = await parseGreenWaveWorkbook(await readFile(file));
  console.log(`Lidos: ${parsed.shows.length} shows, ${parsed.members.length} integrantes, ${parsed.contacts.length} contatos, ${parsed.settlements.length} fechamentos`);

  const exportPath = flag('--export-sanitized');
  if (exportPath) {
    await writeFile(exportPath, JSON.stringify(sanitizeWorkbook(parsed), null, 2) + '\n');
    console.log(`JSON sanitizado salvo em ${exportPath}`);
    return;
  }

  const prisma = new PrismaClient();
  try {
    const slug = flag('--org') ?? 'green-wave';
    const org = await prisma.organization.findUnique({ where: { slug } });
    if (!org) throw new Error(`Organização "${slug}" não encontrada. Rode "npm run db:seed" antes.`);
    const summary = await importIntoOrganization(prisma, org.id, parsed);
    console.table(summary);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
