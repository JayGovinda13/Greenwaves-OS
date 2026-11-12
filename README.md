# Greenwaves OS

Sistema de gestão (SaaS multi-tenant) da produtora **Green Wave** — booking, agenda de shows, casting, contratantes e financeiro — com a identidade visual do portfólio *Casting 2026* (verde floresta texturizado, verde-limão, creme e tipografia display expandida).

**Stack:** Next.js 15 (App Router, Server Components + Server Actions) · MUI 7 (+ X Data Grid / X Charts) · Iconoir · Prisma 6 · Zod · JWT (jose) · TypeScript.

## Módulos

| Módulo | O que faz |
| --- | --- |
| **Painel** | KPIs do ano, shows por mês, circulação por região, próximos shows, pendências de produção (próximos 21 dias), ranking de artistas e trilha de atividades. |
| **Agenda de shows** | Lista (Data Grid com busca/filtros) e calendário mensal. Cada show tem combinado estruturado (cachê fixo, % bilheteria, mínimo ou %), **forma de pagamento** (no ato ou data combinada, gerando um recebível automático no Financeiro que vira *atrasado* se não for pago), **contrapartidas** pré-preenchidas pelo padrão do artista conforme a UF do show, **vendas de ingressos com histórico datado e fonte** (aviso quando desatualizadas) e checklist de produção. |
| **Roadbook & roadmap** | Roteiro do dia por show (embarque, chegada, check-in, passagem de som, show, check-out…) com check de cada etapa e roteiro padrão calculado pelo trecho. Exportação para impressão/PDF: **roadbook** (folha do dia com horários, mapa do trajeto, casa, hotel, contatos, logística, contrapartidas, equipe e checklist) e **roadmap** da turnê (mapa com a rota, trechos com km/tempo, embarque, check-in, horários e produção de cada data). Cidades localizadas offline pela base do IBGE; rota rodoviária via OSRM com estimativa de reserva. |
| **Ficha técnica & mapa de palco** | Modelo por artista: formação, lista de canais, retornos, backline (casa fornece / banda leva), PA, luz, energia, tempos, contato técnico e **mapa de palco montado no sistema** (editor de arrastar e soltar com bateria, amps, microfones, monitores, DI, tomadas, praticável…). Cada show usa o modelo e completa com casa, endereço, horários do roteiro e contato técnico da casa; pode ser personalizado só para aquele show. Exporta em PDF A4. |
| **Casting** | Cards e página do artista no formato dos slides do portfólio: release, @, materiais (Mídia kit, Rider e mapa de palco, Fotos, Planilha de fechamento), estatísticas, histórico e **dados da banda** (RG/CPF visíveis só para administração). |
| **Contratantes** | CRM de casas, festivais, coletivos e produtores, com filtro por região/tipo, atalhos de WhatsApp, e-mail e Instagram e **adimplência** (pagamentos em dia, com atraso e vencidos dos shows vinculados). |
| **Financeiro** | Receitas/despesas, a receber, vencidos, fluxo mensal, vínculo com show/artista e links das planilhas de fechamento. |
| **Configurações** | Dados da produtora, equipe com papéis (RBAC), **importação da planilha .xlsx** e troca de senha. |

### SaaS / segurança
- **Multi-tenant**: toda entidade pertence a uma `Organization`; todas as consultas e mutações filtram por `organizationId` da sessão. Novas produtoras são criadas com `npm run org:create` (o site oferece "Agende uma demo"); usuários podem pertencer a várias e trocar no menu.
- **RBAC**: `OWNER` (sócio) › `ADMIN` › `PRODUCER` › `VIEWER`, checado em cada Server Action (`requireRole`).
- Sessão JWT HS256 em cookie `httpOnly`, rotas protegidas por middleware, senhas com bcrypt.
- Validação de entrada com Zod, valores monetários em centavos, trilha de auditoria (`Activity`).

## Rodando localmente

```bash
cp .env.example .env   # defina AUTH_SECRET (openssl rand -base64 32)
npm install
npm run db:up          # Postgres local via Docker
npm run db:push
npm run db:seed
npm run dev
```

Acesse http://localhost:3000 — login de demonstração: `carol@greenwave.music` / `greenwave2026` (altere com `SEED_PASSWORD`).

### Importando a planilha "Green Wave - Geral"
- Pela interface: **Configurações → Importar planilha** (requer ADMIN).
- Pela linha de comando: coloque o arquivo em `data/greenwave.xlsx` (ignorado pelo git) e rode `npm run import:xlsx -- data/greenwave.xlsx`. O `db:seed` também usa esse arquivo se ele existir.

O import é idempotente e lê as abas *Shows*, *Shows 2027*, *Dados das bandas*, *Contatos*, *Cópia de Lista de Contatos* e *Fechamentos*. O texto livre da coluna “Combinado” (ex.: `1500 de minimo ou 70% bilheteria`, `6k + van + alimentação + hotel`) é interpretado em modelo, valor, % e contrapartidas (`src/lib/deal.ts`).

> Dados pessoais (RG, CPF, telefones) **não** são versionados: o seed do repositório (`prisma/data/seed-workbook.json`) é uma versão sanitizada gerada com `npm run import:xlsx -- data/greenwave.xlsx --export-sanitized prisma/data/seed-workbook.json`.

## Deploy no Vercel
1. **Banco:** no projeto do Vercel, *Storage → Create Database → Neon (Postgres)* e conecte ao projeto. Isso cria `DATABASE_URL` automaticamente.
2. **Segredo:** *Settings → Environment Variables* → `AUTH_SECRET` com um valor aleatório longo (`openssl rand -base64 32`), em Production e Preview.
3. **Redeploy.** O script `vercel-build` gera o Prisma Client e cria/atualiza as tabelas (`prisma db push`) antes do `next build`.
4. Abra `https://SEU-APP.vercel.app/api/health` — deve responder `"ok": true`.
5. (Opcional) Configure `DEMO_WHATSAPP` e/ou `DEMO_EMAIL` para a página **Agende uma demo** (`/demo`).
6. Crie as produtoras clientes com `npm run org:create -- --name "Produtora" --owner "Pessoa" --email pessoa@exemplo.com` (rodando localmente com o `DATABASE_URL` do Neon). A pessoa entra com a senha temporária, troca em *Configurações → Minha conta*, baixa o modelo em *Configurações → Importar planilha* e convida a equipe.

> Não há cadastro público: quem chega pelo site vê o formulário de demo, e as contas são criadas por você.

## Estrutura
```
prisma/            schema, seed, dados do casting e seed sanitizado
scripts/           importador CLI da planilha
src/app/(auth)     login, agendamento de demo e actions de sessão
src/app/(app)      painel, shows, artistas, contatos, financeiro, configurações (+ actions)
src/components     UI por módulo e componentes de marca (logo, WaveMark)
src/lib            domínio (zod/enums), tenant/RBAC, sessão, parser de combinado, importador
src/theme          tema MUI (claro/escuro) e tokens da marca
```
