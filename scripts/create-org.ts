/**
 * Cria uma produtora (organização) com a pessoa responsável como sócia (OWNER).
 * Use depois da demo, já que o cadastro público é fechado.
 *
 *   npm run org:create -- --name "Nome da Produtora" --owner "Nome da Pessoa" --email pessoa@exemplo.com
 *
 * Imprime uma senha temporária (exibida uma única vez); a pessoa troca em Configurações → Minha conta.
 */
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { slugify } from '../src/lib/format';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const name = arg('name')?.trim();
  const owner = arg('owner')?.trim();
  const email = arg('email')?.trim().toLowerCase();
  if (!name || !owner || !email) throw new Error('Uso: npm run org:create -- --name "Produtora" --owner "Pessoa" --email email@exemplo.com');

  const prisma = new PrismaClient();
  try {
    let slug = slugify(name) || 'produtora';
    if (await prisma.organization.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
    const org = await prisma.organization.create({ data: { name, slug, email } });

    let user = await prisma.user.findUnique({ where: { email } });
    let tempPassword: string | null = null;
    if (!user) {
      tempPassword = crypto.randomBytes(9).toString('base64url');
      user = await prisma.user.create({ data: { name: owner, email, passwordHash: await bcrypt.hash(tempPassword, 10) } });
    }
    await prisma.membership.create({ data: { userId: user.id, organizationId: org.id, role: 'OWNER' } });

    console.log(`\nProdutora criada: ${org.name} (${org.slug})`);
    console.log(`Acesso: ${email}`);
    console.log(tempPassword ? `Senha temporária: ${tempPassword}` : 'Usuário já existia: usa a senha atual e troca de produtora no menu do avatar.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
