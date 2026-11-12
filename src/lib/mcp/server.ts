// Servidor MCP do Greenwaves OS: ferramentas que o Claude pode usar em nome de quem gerou a chave.
//
// LGPD — regras aplicadas em todas as ferramentas:
// - Isolamento: tudo é filtrado pela produtora da chave; o papel (RBAC) é o atual da pessoa.
// - Minimização: nunca saem RG, CPF, data de nascimento nem preferências/restrições (podem ser dados de saúde).
//   Telefone/e-mail de contratante só em `ver_contratante` (consulta individual, registrada como acesso a dado pessoal).
// - Registro: toda chamada vai para McpAuditLog (ferramenta, resultado, ids — sem o conteúdo dos dados).
import 'server-only';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { prisma } from '../db';
import {
  DEAL_TYPES, DEAL_TYPE_LABEL, HOSPITALITY, HOSPITALITY_LABEL, PAYMENT_TERMS_LABEL, ROLE_RANK, SCHEDULE_KIND_LABEL, SHOW_CHECKLIST,
  SHOW_STATUS, SHOW_STATUS_LABEL, TASK_PRIORITIES, TICKET_SOURCES, TX_CATEGORY_LABEL, hospitalityLabels,
  type ChecklistKey, type DealType, type PaymentTerms, type Role, type ScheduleKind, type ShowStatus, type TxCategory,
} from '../domain';
import { fmtDate, slugify, toCalendarDate } from '../format';
import { checklistProgress } from '../queries';
import { receivableState, syncShowReceivable } from '../receivables';
import { defaultSchedule, legToShow, scheduleSortKey } from '../tour';
import { audit, type McpContext } from './tokens';

type Json = Record<string, unknown> | unknown[];

class ToolError extends Error {}

const INSTRUCTIONS = `Você está conectado ao Greenwaves OS da produtora. Use as ferramentas para consultar e operar agenda de shows,
casting, contratantes, financeiro e tarefas. Datas em AAAA-MM-DD; valores em reais.
Dados pessoais (nomes, telefones e e-mails de contratantes e integrantes) devem ser usados apenas para a operação dos shows
desta produtora — não os copie para outros contextos sem necessidade. Antes de criar ou alterar registros, confirme com a pessoa
quando a intenção não estiver clara.`;

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const reais = (cents: number | null | undefined) => (cents === null || cents === undefined ? null : cents / 100);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD');

export function buildMcpServer(ctx: McpContext, baseUrl: string) {
  const server = new McpServer({ name: 'greenwaves-os', version: '1.0.0' }, { instructions: INSTRUCTIONS });
  const orgId = ctx.org.id;
  const actor = { user: { id: ctx.user.id, name: ctx.user.name, email: ctx.user.email }, org: ctx.org };

  /** Envolve cada ferramenta: permissões, erros amigáveis e registro de operação. */
  function tool<S extends z.ZodRawShape>(
    name: string,
    opts: { title: string; description: string; input: S; write?: boolean; minRole?: Role },
    fn: (args: z.objectOutputType<S, z.ZodTypeAny>) => Promise<{ data: Json; summary?: string; personalData?: boolean }>,
  ) {
    server.registerTool(
      name,
      {
        title: opts.title,
        description: opts.description,
        inputSchema: opts.input,
        annotations: { readOnlyHint: !opts.write, destructiveHint: false, openWorldHint: false },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async (args: any) => {
        try {
          if (opts.write && ctx.scope !== 'WRITE') throw new ToolError('Esta chave é somente leitura. Gere uma chave com permissão de escrita para fazer alterações.');
          const min = opts.minRole ?? (opts.write ? 'PRODUCER' : 'VIEWER');
          if (ROLE_RANK[ctx.role] < ROLE_RANK[min]) throw new ToolError('Seu papel na produtora não permite esta ação.');
          const r = await fn(args);
          await audit(ctx, name, true, r.summary, r.personalData);
          return { content: [{ type: 'text' as const, text: JSON.stringify(r.data, null, 2) }] };
        } catch (e) {
          const msg = e instanceof ToolError || e instanceof z.ZodError ? e.message : 'Erro inesperado ao executar a ferramenta.';
          if (!(e instanceof ToolError)) console.error('[mcp]', name, e);
          await audit(ctx, name, false, msg);
          return { isError: true, content: [{ type: 'text' as const, text: msg }] };
        }
      }) as never,
    );
  }

  const logAct = (action: string, entity: string, entityId: string | null, summary: string) =>
    prisma.activity.create({ data: { organizationId: orgId, userId: actor.user.id, action, entity, entityId, summary: `${summary} (via Claude)` } });

  async function findArtist(ref: string) {
    const byId = await prisma.artist.findFirst({ where: { id: ref, organizationId: orgId } });
    if (byId) return byId;
    const all = await prisma.artist.findMany({ where: { organizationId: orgId }, select: { id: true, name: true, slug: true } });
    const s = slugify(ref);
    const hit = all.find((a) => a.slug === s) ?? all.find((a) => a.slug.includes(s) || s.includes(a.slug));
    if (!hit) throw new ToolError(`Artista "${ref}" não encontrado. Disponíveis: ${all.map((a) => a.name).join(', ')}`);
    return prisma.artist.findUniqueOrThrow({ where: { id: hit.id } });
  }
  async function findShow(id: string) {
    const show = await prisma.show.findFirst({ where: { id, organizationId: orgId }, include: { artist: { select: { id: true, name: true } } } });
    if (!show) throw new ToolError('Show não encontrado. Use listar_shows para obter o id.');
    return show;
  }
  const links = (showId: string) => ({
    pagina: `${baseUrl}/shows/${showId}`,
    roadbook: `${baseUrl}/imprimir/roadbook/${showId}`,
    ficha_tecnica: `${baseUrl}/imprimir/ficha-tecnica/${showId}`,
  });
  const dealText = (s: { dealType: string; fee: number | null; doorPercent: number | null }) =>
    s.dealType === 'FIXED' ? `Cachê fixo R$ ${reais(s.fee)}`
      : s.dealType === 'DOOR' ? `${s.doorPercent ?? 100}% da bilheteria`
      : s.dealType === 'GUARANTEE_OR_DOOR' ? `Mínimo R$ ${reais(s.fee)} ou ${s.doorPercent ?? 100}% da bilheteria`
      : DEAL_TYPE_LABEL[s.dealType as DealType] ?? s.dealType;

  // ------------------------------------------------------------------ leitura
  tool('resumo_produtora', {
    title: 'Resumo da produtora',
    description: 'Visão geral: próximos shows (30 dias), pendências de produção, recebimentos atrasados e tarefas abertas da pessoa conectada.',
    input: {},
  }, async () => {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 86400000);
    const [next, rx, tasks] = await Promise.all([
      prisma.show.findMany({ where: { organizationId: orgId, status: { not: 'CANCELED' }, date: { gte: new Date(isoDay(now)), lte: in30 } }, include: { artist: { select: { name: true } } }, orderBy: { date: 'asc' } }),
      prisma.transaction.findMany({ where: { organizationId: orgId, type: 'INCOME', status: 'PENDING' } }),
      prisma.task.count({ where: { organizationId: orgId, assigneeId: ctx.user.id, status: 'TODO' } }),
    ]);
    const overdue = rx.filter((t) => receivableState(t) === 'OVERDUE');
    return {
      data: {
        produtora: ctx.org.name,
        pessoa: { nome: ctx.user.name, papel: ctx.role, acesso: ctx.scope === 'WRITE' ? 'leitura e escrita' : 'somente leitura' },
        proximos_30_dias: next.map((s) => ({ id: s.id, data: isoDay(s.date), artista: s.artist.name, cidade: [s.city, s.state].filter(Boolean).join('/'), local: s.venue, producao: `${checklistProgress(s).done}/9` })),
        recebimentos_atrasados: { quantidade: overdue.length, total_reais: reais(overdue.reduce((a, t) => a + t.amount, 0)) },
        minhas_tarefas_abertas: tasks,
      },
    };
  });

  tool('listar_shows', {
    title: 'Listar shows',
    description: 'Lista shows com filtros opcionais. Retorna id, data, artista, cidade, local, status, combinado, pagamento e andamento da produção.',
    input: {
      de: day.optional().describe('Data inicial (AAAA-MM-DD). Padrão: hoje.'),
      ate: day.optional().describe('Data final (AAAA-MM-DD).'),
      artista: z.string().optional().describe('Nome ou id do artista'),
      status: z.enum(SHOW_STATUS).optional(),
      cidade: z.string().optional(),
      limite: z.number().int().min(1).max(200).optional(),
    },
  }, async (a) => {
    const artist = a.artista ? await findArtist(a.artista) : null;
    const shows = await prisma.show.findMany({
      where: {
        organizationId: orgId,
        artistId: artist?.id,
        status: a.status,
        city: a.cidade ? { contains: a.cidade, mode: 'insensitive' } : undefined,
        date: { gte: new Date(`${a.de ?? isoDay(new Date())}T00:00:00Z`), ...(a.ate ? { lte: new Date(`${a.ate}T23:59:59Z`) } : {}) },
      },
      include: { artist: { select: { name: true } }, transactions: { where: { source: 'SHOW_FEE' } } },
      orderBy: { date: 'asc' },
      take: a.limite ?? 50,
    });
    return {
      data: shows.map((s) => {
        const rx = s.transactions[0];
        return {
          id: s.id, data: isoDay(s.date), artista: s.artist.name, cidade: s.city, uf: s.state, local: s.venue,
          status: SHOW_STATUS_LABEL[s.status as ShowStatus], combinado: dealText(s),
          pagamento: PAYMENT_TERMS_LABEL[s.paymentTerms as PaymentTerms], recebimento: rx ? receivableState(rx) : null,
          producao: `${checklistProgress(s).done}/9`, ingressos_vendidos: s.ticketsSold,
          vendas_atualizadas_em: s.ticketsUpdatedAt ? isoDay(s.ticketsUpdatedAt) : null,
        };
      }),
      summary: `${shows.length} shows listados`,
    };
  });

  tool('ver_show', {
    title: 'Detalhes do show',
    description: 'Detalhes completos de um show: combinado, pagamento, contrapartidas, roteiro do dia, checklist, vendas e links do roadbook e da ficha técnica.',
    input: { show_id: z.string() },
  }, async ({ show_id }) => {
    await findShow(show_id);
    const s = await prisma.show.findUniqueOrThrow({
      where: { id: show_id },
      include: {
        artist: { select: { name: true } }, contact: { select: { id: true, name: true, company: true } },
        scheduleItems: true, ticketReports: { orderBy: { reportedAt: 'desc' }, take: 5 }, transactions: { where: { source: 'SHOW_FEE' } },
      },
    });
    const rx = s.transactions[0];
    return {
      data: {
        id: s.id, data: isoDay(s.date), artista: s.artist.name, evento: s.eventName, local: s.venue, endereco: s.venueAddress,
        cidade: s.city, uf: s.state, status: SHOW_STATUS_LABEL[s.status as ShowStatus],
        combinado: dealText(s), texto_combinado: s.dealNotes,
        pagamento: { forma: PAYMENT_TERMS_LABEL[s.paymentTerms as PaymentTerms], vencimento: rx?.dueDate ? isoDay(rx.dueDate) : null, situacao: rx ? receivableState(rx) : null },
        contrapartidas: hospitalityLabels(s.hospitality), contrapartidas_obs: s.hospitalityNotes,
        contratante: s.contact ? { id: s.contact.id, nome: s.contact.name, empresa: s.contact.company } : null,
        contato_no_dia: s.contactName,
        hotel: s.lodgingName ? { nome: s.lodgingName, endereco: s.lodgingAddress } : null,
        roteiro_do_dia: [...s.scheduleItems].sort((x, y) => scheduleSortKey(x).localeCompare(scheduleSortKey(y))).map((i) => ({
          dia: i.day, hora: i.time, etapa: SCHEDULE_KIND_LABEL[i.kind as ScheduleKind], descricao: i.title, local: i.location, feito: i.done,
        })),
        checklist: Object.fromEntries(SHOW_CHECKLIST.map((c) => [c.label, s[c.key]])),
        ingressos: { vendidos: s.ticketsSold, capacidade: s.capacity, historico: s.ticketReports.map((r) => ({ em: r.reportedAt.toISOString(), vendidos: r.sold, fonte: r.source })) },
        links: links(s.id),
      },
      summary: `show ${s.id}`,
      personalData: !!s.contactName,
    };
  });

  tool('listar_artistas', {
    title: 'Listar artistas do casting',
    description: 'Casting da produtora com origem, gêneros, próximo show e se já tem ficha técnica.',
    input: {},
  }, async () => {
    const now = new Date(isoDay(new Date()));
    const artists = await prisma.artist.findMany({
      where: { organizationId: orgId },
      include: { shows: { where: { date: { gte: now }, status: { not: 'CANCELED' } }, orderBy: { date: 'asc' }, select: { date: true, city: true } } },
      orderBy: { name: 'asc' },
    });
    return {
      data: artists.map((a) => ({
        id: a.id, nome: a.name, instagram: a.instagram, origem: [a.originCity, a.originState].filter(Boolean).join('/'), generos: a.genres,
        ativo: a.active, shows_por_vir: a.shows.length, proximo_show: a.shows[0] ? `${isoDay(a.shows[0].date)} ${a.shows[0].city ?? ''}`.trim() : null,
        tem_ficha_tecnica: !!a.techRider, link_roadmap: `${baseUrl}/imprimir/roadmap?artist=${a.id}`,
      })),
    };
  });

  tool('ver_artista', {
    title: 'Detalhes do artista',
    description: 'Release, materiais, formação (nome e função) e próximos shows de um artista. Não inclui documentos pessoais.',
    input: { artista: z.string().describe('Nome ou id do artista') },
  }, async ({ artista }) => {
    const a = await findArtist(artista);
    const [members, shows] = await Promise.all([
      prisma.artistMember.findMany({ where: { artistId: a.id }, select: { name: true, role: true }, orderBy: { name: 'asc' } }),
      prisma.show.findMany({ where: { artistId: a.id, status: { not: 'CANCELED' }, date: { gte: new Date(isoDay(new Date())) } }, orderBy: { date: 'asc' }, take: 20 }),
    ]);
    return {
      data: {
        id: a.id, nome: a.name, instagram: a.instagram, origem: [a.originCity, a.originState].filter(Boolean).join('/'), generos: a.genres,
        release: a.bio, ultimo_lancamento: a.latestRelease, selo: a.label,
        materiais: { midia_kit: a.mediaKitUrl, rider: a.riderUrl, fotos: a.photosUrl, ficha_tecnica: a.techRider ? `${baseUrl}/imprimir/ficha-tecnica/artista/${a.id}` : null },
        formacao: members.map((m) => ({ nome: m.name, funcao: m.role })),
        proximos_shows: shows.map((s) => ({ id: s.id, data: isoDay(s.date), cidade: s.city, uf: s.state, local: s.venue, status: SHOW_STATUS_LABEL[s.status as ShowStatus] })),
      },
      summary: `artista ${a.id}`,
      personalData: members.length > 0,
    };
  });

  tool('buscar_contratantes', {
    title: 'Buscar contratantes',
    description: 'Busca casas, festivais, coletivos e produtores. Não traz telefone nem e-mail — use ver_contratante para o contato de um registro específico.',
    input: { busca: z.string().optional(), uf: z.string().length(2).optional(), regiao: z.string().optional() },
  }, async (a) => {
    const rows = await prisma.contact.findMany({
      where: {
        organizationId: orgId,
        state: a.uf?.toUpperCase(),
        region: a.regiao ? { equals: a.regiao, mode: 'insensitive' } : undefined,
        ...(a.busca ? { OR: [{ name: { contains: a.busca, mode: 'insensitive' } }, { company: { contains: a.busca, mode: 'insensitive' } }, { city: { contains: a.busca, mode: 'insensitive' } }] } : {}),
      },
      include: { _count: { select: { shows: true } } },
      take: 50,
      orderBy: { name: 'asc' },
    });
    return { data: rows.map((c) => ({ id: c.id, nome: c.name, casa: c.company, tipo: c.kind, cidade: c.city, uf: c.state, regiao: c.region, instagram: c.instagram, shows: c._count.shows })) };
  });

  tool('ver_contratante', {
    title: 'Contato do contratante',
    description: 'Telefone, e-mail, shows e histórico de pagamentos de um contratante. Acesso a dado pessoal: fica registrado.',
    input: { contratante_id: z.string() },
  }, async ({ contratante_id }) => {
    const c = await prisma.contact.findFirst({
      where: { id: contratante_id, organizationId: orgId },
      include: { shows: { orderBy: { date: 'desc' }, take: 20, include: { artist: { select: { name: true } }, transactions: { where: { source: 'SHOW_FEE' } } } } },
    });
    if (!c) throw new ToolError('Contratante não encontrado.');
    const states = c.shows.flatMap((s) => s.transactions.map((t) => receivableState(t)));
    return {
      data: {
        id: c.id, nome: c.name, casa: c.company, cidade: c.city, uf: c.state, telefone: c.phone, email: c.email, instagram: c.instagram, link: c.link,
        pagamentos: { em_dia: states.filter((x) => x === 'PAID').length, com_atraso: states.filter((x) => x === 'PAID_LATE').length, vencidos: states.filter((x) => x === 'OVERDUE').length, a_vencer: states.filter((x) => x === 'PENDING').length },
        shows: c.shows.map((s) => ({ id: s.id, data: isoDay(s.date), artista: s.artist.name, local: s.venue })),
      },
      summary: `contratante ${c.id}`,
      personalData: true,
    };
  });

  tool('financeiro_resumo', {
    title: 'Resumo financeiro',
    description: 'Recebido, a receber, atrasados (com detalhes) e despesas no período.',
    input: { de: day.optional(), ate: day.optional() },
  }, async (a) => {
    const txs = await prisma.transaction.findMany({
      where: {
        organizationId: orgId, status: { not: 'CANCELED' },
        ...(a.de || a.ate ? { date: { ...(a.de ? { gte: new Date(`${a.de}T00:00:00Z`) } : {}), ...(a.ate ? { lte: new Date(`${a.ate}T23:59:59Z`) } : {}) } } : {}),
      },
      include: { artist: { select: { name: true } }, show: { select: { id: true, city: true, contact: { select: { name: true } } } } },
    });
    const sum = (f: (t: (typeof txs)[number]) => boolean) => reais(txs.filter(f).reduce((s, t) => s + t.amount, 0));
    const overdue = txs.filter((t) => t.type === 'INCOME' && receivableState(t) === 'OVERDUE');
    return {
      data: {
        recebido: sum((t) => t.type === 'INCOME' && t.status === 'PAID'),
        a_receber: sum((t) => t.type === 'INCOME' && t.status === 'PENDING'),
        despesas_pagas: sum((t) => t.type === 'EXPENSE' && t.status === 'PAID'),
        despesas_a_pagar: sum((t) => t.type === 'EXPENSE' && t.status === 'PENDING'),
        atrasados: overdue.map((t) => ({
          lancamento_id: t.id, descricao: t.description, valor: reais(t.amount), vencimento: isoDay(t.dueDate ?? t.date),
          artista: t.artist?.name, show_id: t.show?.id, contratante: t.show?.contact?.name ?? null,
          categoria: TX_CATEGORY_LABEL[t.category as TxCategory],
        })),
      },
    };
  });

  tool('listar_tarefas', {
    title: 'Listar tarefas',
    description: 'Tarefas abertas: as suas, as que você delegou ou todas da equipe.',
    input: { filtro: z.enum(['minhas', 'delegadas', 'equipe']).optional() },
  }, async ({ filtro = 'minhas' }) => {
    const where =
      filtro === 'minhas' ? { assigneeId: ctx.user.id }
        : filtro === 'delegadas' ? { creatorId: ctx.user.id, NOT: { assigneeId: ctx.user.id } }
        : {};
    const tasks = await prisma.task.findMany({
      where: { organizationId: orgId, status: 'TODO', ...where },
      include: { assignee: { select: { name: true } }, creator: { select: { name: true } }, show: { select: { id: true, date: true, city: true } } },
      orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }],
      take: 100,
    });
    return {
      data: tasks.map((t) => ({
        id: t.id, titulo: t.title, prioridade: t.priority, prazo: t.dueDate ? isoDay(t.dueDate) : null,
        responsavel: t.assignee?.name, criada_por: t.creator?.name, show: t.show ? { id: t.show.id, data: isoDay(t.show.date), cidade: t.show.city } : null,
      })),
    };
  });

  tool('link_roadmap', {
    title: 'Link do roadmap da turnê',
    description: 'Gera o link do roadmap (mapa, rota, trechos e horários) de um artista num período, para abrir ou imprimir.',
    input: { artista: z.string(), de: day, ate: day },
  }, async (a) => {
    const art = await findArtist(a.artista);
    return { data: { artista: art.name, link: `${baseUrl}/imprimir/roadmap?artist=${art.id}&from=${a.de}&to=${a.ate}` } };
  });

  // ------------------------------------------------------------------ escrita
  const showWritable = {
    data: day.optional(),
    status: z.enum(SHOW_STATUS).optional(),
    cidade: z.string().max(80).optional(),
    uf: z.string().length(2).optional(),
    local: z.string().max(120).optional(),
    endereco_local: z.string().max(200).optional(),
    evento: z.string().max(120).optional(),
    modelo_combinado: z.enum(DEAL_TYPES).optional().describe('FIXED (cachê fixo), DOOR (% bilheteria), GUARANTEE_OR_DOOR (mínimo ou %), FREE, TBD'),
    cache_reais: z.number().min(0).optional(),
    percentual_bilheteria: z.number().int().min(0).max(100).optional(),
    pagamento: z.enum(['no_ato', 'data_combinada']).optional(),
    data_pagamento: day.optional().describe('Obrigatória quando pagamento = data_combinada'),
    contrapartidas: z.array(z.enum(HOSPITALITY)).optional().describe(`Códigos: ${HOSPITALITY.map((h) => `${h} (${HOSPITALITY_LABEL[h]})`).join(', ')}`),
    hotel: z.string().max(120).optional(),
    observacoes: z.string().max(2000).optional(),
  };
  type ShowWritable = { [K in keyof typeof showWritable]?: z.infer<(typeof showWritable)[K]> };
  const toShowData = (a: ShowWritable) => {
    const d: Record<string, unknown> = {};
    if (a.data) d.date = toCalendarDate(a.data);
    if (a.status) d.status = a.status;
    if (a.cidade !== undefined) d.city = a.cidade;
    if (a.uf) d.state = a.uf.toUpperCase();
    if (a.local !== undefined) d.venue = a.local;
    if (a.endereco_local !== undefined) d.venueAddress = a.endereco_local;
    if (a.evento !== undefined) d.eventName = a.evento;
    if (a.modelo_combinado) d.dealType = a.modelo_combinado;
    if (a.cache_reais !== undefined) d.fee = Math.round(a.cache_reais * 100);
    if (a.percentual_bilheteria !== undefined) d.doorPercent = a.percentual_bilheteria;
    if (a.pagamento) d.paymentTerms = a.pagamento === 'data_combinada' ? 'SCHEDULED' : 'ON_SITE';
    if (a.data_pagamento) d.paymentDueDate = toCalendarDate(a.data_pagamento);
    if (a.pagamento === 'no_ato') d.paymentDueDate = null;
    if (a.contrapartidas) d.hospitality = a.contrapartidas.join(',');
    if (a.hotel !== undefined) d.lodgingName = a.hotel;
    if (a.observacoes !== undefined) d.notes = a.observacoes;
    return d;
  };
  const afterShowWrite = async (id: string) => {
    const s = await prisma.show.findUniqueOrThrow({ where: { id }, include: { artist: { select: { name: true } } } });
    if (s.paymentTerms === 'SCHEDULED' && !s.paymentDueDate) throw new ToolError('Informe data_pagamento para pagamento em data combinada.');
    await syncShowReceivable(prisma, s, s.artist.name);
    return s;
  };

  tool('criar_show', {
    title: 'Criar show',
    description: 'Cadastra um show. Com cachê fixo ou mínimo garantido, gera automaticamente o recebível no financeiro com o vencimento da forma de pagamento.',
    input: { artista: z.string().describe('Nome ou id do artista'), ...showWritable, data: day },
    write: true,
  }, async (a) => {
    const art = await findArtist(a.artista);
    const data = toShowData(a);
    const show = await prisma.show.create({
      data: { organizationId: orgId, artistId: art.id, ownerId: ctx.user.id, date: data.date as Date, status: (a.status ?? 'CONFIRMED') as string, dealType: (a.modelo_combinado ?? 'TBD') as string, ...data },
    });
    const s = await afterShowWrite(show.id);
    await logAct('created', 'show', s.id, `${art.name} em ${s.city ?? s.venue ?? '—'} (${fmtDate(s.date)})`);
    return { data: { criado: true, id: s.id, links: links(s.id) }, summary: `show ${s.id} criado` };
  });

  tool('atualizar_show', {
    title: 'Atualizar show',
    description: 'Altera campos de um show (só os informados). Mantém o recebível do financeiro sincronizado.',
    input: { show_id: z.string(), ...showWritable },
    write: true,
  }, async ({ show_id, ...a }) => {
    const before = await findShow(show_id);
    const data = toShowData(a);
    if (!Object.keys(data).length) throw new ToolError('Nenhum campo para atualizar.');
    await prisma.show.update({ where: { id: show_id }, data });
    const s = await afterShowWrite(show_id);
    await logAct('updated', 'show', show_id, `${before.artist.name}: ${Object.keys(data).join(', ')}`);
    return { data: { atualizado: true, id: s.id, status: SHOW_STATUS_LABEL[s.status as ShowStatus], combinado: dealText(s) }, summary: `show ${s.id} atualizado` };
  });

  tool('atualizar_vendas', {
    title: 'Atualizar vendas de ingressos',
    description: 'Registra quantos ingressos foram vendidos até agora, com a fonte da informação.',
    input: { show_id: z.string(), vendidos: z.number().int().min(0), fonte: z.enum(TICKET_SOURCES).optional(), observacao: z.string().max(200).optional() },
    write: true,
  }, async (a) => {
    const s = await findShow(a.show_id);
    const now = new Date();
    await prisma.ticketReport.create({ data: { showId: s.id, sold: a.vendidos, source: a.fonte ?? 'MANUAL', note: a.observacao, reportedById: ctx.user.id, reportedAt: now } });
    await prisma.show.update({ where: { id: s.id }, data: { ticketsSold: a.vendidos, ticketsUpdatedAt: now } });
    await logAct('updated', 'show', s.id, `Vendas atualizadas: ${a.vendidos} ingressos`);
    return { data: { ok: true, vendidos: a.vendidos }, summary: `vendas show ${s.id}` };
  });

  tool('marcar_checklist', {
    title: 'Marcar item do checklist de produção',
    description: `Marca ou desmarca um item do checklist. Itens: ${SHOW_CHECKLIST.map((c) => `${c.key} (${c.label})`).join(', ')}`,
    input: { show_id: z.string(), item: z.enum(SHOW_CHECKLIST.map((c) => c.key) as [ChecklistKey, ...ChecklistKey[]]), feito: z.boolean() },
    write: true,
  }, async (a) => {
    const s = await findShow(a.show_id);
    await prisma.show.update({ where: { id: s.id }, data: { [a.item]: a.feito } });
    return { data: { ok: true }, summary: `checklist ${a.item} show ${s.id}` };
  });

  tool('gerar_roteiro_do_dia', {
    title: 'Gerar roteiro do dia',
    description: 'Cria o roteiro padrão (embarque, chegada, check-in, passagem de som, show, check-out) calculado pelo trecho. Só funciona se o show ainda não tiver roteiro.',
    input: { show_id: z.string() },
    write: true,
  }, async ({ show_id }) => {
    const s = await findShow(show_id);
    if (await prisma.showScheduleItem.count({ where: { showId: s.id } })) throw new ToolError('Este show já tem roteiro. Edite pelo sistema.');
    const { leg } = await legToShow(orgId, s.id);
    const items = defaultSchedule(isoDay(s.date), leg);
    await prisma.showScheduleItem.createMany({ data: items.map((i) => ({ ...i, showId: s.id, title: i.title ?? null, location: i.location ?? null })) });
    await logAct('updated', 'show', s.id, 'Roteiro do dia gerado');
    return { data: { roteiro: items.map((i) => ({ dia: i.day, hora: i.time, etapa: SCHEDULE_KIND_LABEL[i.kind] })), roadbook: links(s.id).roadbook }, summary: `roteiro show ${s.id}` };
  });

  tool('criar_tarefa', {
    title: 'Criar ou delegar tarefa',
    description: 'Cria uma tarefa para você ou para outra pessoa da equipe (por nome ou e-mail).',
    input: {
      titulo: z.string().min(1).max(200),
      responsavel: z.string().optional().describe('Nome ou e-mail de alguém da equipe. Padrão: você.'),
      prazo: day.optional(),
      prioridade: z.enum(TASK_PRIORITIES).optional(),
      show_id: z.string().optional(),
      detalhes: z.string().max(2000).optional(),
    },
    write: true,
  }, async (a) => {
    let assigneeId = ctx.user.id;
    let assigneeName = ctx.user.name;
    if (a.responsavel) {
      const members = await prisma.membership.findMany({ where: { organizationId: orgId }, select: { user: { select: { id: true, name: true, email: true } } } });
      const q = a.responsavel.toLowerCase();
      const hit = members.find((m) => m.user.email.toLowerCase() === q) ?? members.find((m) => m.user.name.toLowerCase().includes(q));
      if (!hit) throw new ToolError(`Ninguém da equipe corresponde a "${a.responsavel}". Equipe: ${members.map((m) => m.user.name).join(', ')}`);
      assigneeId = hit.user.id;
      assigneeName = hit.user.name;
    }
    if (a.show_id) await findShow(a.show_id);
    const t = await prisma.task.create({
      data: {
        organizationId: orgId, creatorId: ctx.user.id, assigneeId, title: a.titulo, description: a.detalhes ?? null,
        priority: a.prioridade ?? 'NORMAL', dueDate: a.prazo ? toCalendarDate(a.prazo) : null, showId: a.show_id ?? null,
      },
    });
    await logAct('created', 'task', t.id, assigneeId === ctx.user.id ? a.titulo : `${a.titulo} → ${assigneeName}`);
    return { data: { criada: true, id: t.id, responsavel: assigneeName }, summary: `tarefa ${t.id}` };
  });

  tool('concluir_tarefa', {
    title: 'Concluir tarefa',
    description: 'Marca como concluída uma tarefa sua ou que você criou.',
    input: { tarefa_id: z.string() },
    write: true,
  }, async ({ tarefa_id }) => {
    const t = await prisma.task.findFirst({ where: { id: tarefa_id, organizationId: orgId } });
    if (!t) throw new ToolError('Tarefa não encontrada.');
    if (t.assigneeId !== ctx.user.id && t.creatorId !== ctx.user.id && ROLE_RANK[ctx.role] < ROLE_RANK.ADMIN)
      throw new ToolError('Só o responsável ou quem criou pode concluir esta tarefa.');
    await prisma.task.update({ where: { id: t.id }, data: { status: 'DONE', completedAt: new Date() } });
    await logAct('completed', 'task', t.id, t.title);
    return { data: { concluida: true }, summary: `tarefa ${t.id} concluída` };
  });

  tool('marcar_recebimento_pago', {
    title: 'Marcar recebimento como pago',
    description: 'Confirma o pagamento de um lançamento do financeiro (registra a data de hoje como data de pagamento).',
    input: { lancamento_id: z.string() },
    write: true,
    minRole: 'ADMIN',
  }, async ({ lancamento_id }) => {
    const t = await prisma.transaction.findFirst({ where: { id: lancamento_id, organizationId: orgId } });
    if (!t) throw new ToolError('Lançamento não encontrado.');
    await prisma.transaction.update({ where: { id: t.id }, data: { status: 'PAID', paidAt: new Date() } });
    await logAct('updated', 'transaction', t.id, `${t.description} marcado como pago`);
    return { data: { pago: true }, summary: `lançamento ${t.id} pago` };
  });

  return server;
}
