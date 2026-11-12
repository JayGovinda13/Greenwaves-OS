/**
 * Cifra RG/CPF de integrantes que ainda estão em texto puro (dados anteriores à criptografia).
 * Idempotente: valores já cifrados são ignorados.
 *   npm run lgpd:encrypt
 */
import { PrismaClient } from '@prisma/client';
import { encryptField, isEncrypted } from '../src/lib/crypto';

async function main() {
  const prisma = new PrismaClient();
  try {
    const members = await prisma.artistMember.findMany({
      where: { OR: [{ documentRg: { not: null } }, { documentCpf: { not: null } }] },
      select: { id: true, documentRg: true, documentCpf: true },
    });
    let n = 0;
    for (const m of members) {
      if ((m.documentRg && !isEncrypted(m.documentRg)) || (m.documentCpf && !isEncrypted(m.documentCpf))) {
        await prisma.artistMember.update({ where: { id: m.id }, data: { documentRg: encryptField(m.documentRg), documentCpf: encryptField(m.documentCpf) } });
        n++;
      }
    }
    console.log(`${n} integrante(s) com documentos cifrados agora; ${members.length - n} já estavam cifrados.`);
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
