// Teste do conector MCP com o cliente oficial: node scripts/mcp-smoke.mjs URL CHAVE_ESCRITA CHAVE_LEITURA
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const [url, writeKey, readKey] = process.argv.slice(2);
async function connect(key) {
  const client = new Client({ name: 'smoke', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers: { Authorization: `Bearer ${key}` } } }));
  return client;
}
const call = async (c, name, args = {}) => {
  const r = await c.callTool({ name, arguments: args });
  return { erro: !!r.isError, texto: r.content[0].text };
};

const w = await connect(writeKey);
const { tools } = await w.listTools();
console.log(`ferramentas (${tools.length}):`, tools.map((t) => t.name).join(', '));
console.log('instruções do servidor:', (w.getInstructions() ?? '').slice(0, 80), '…');

const resumo = JSON.parse((await call(w, 'resumo_produtora')).texto);
console.log('resumo:', JSON.stringify({ ...resumo, proximos_30_dias: `${resumo.proximos_30_dias.length} shows` }));

const shows = JSON.parse((await call(w, 'listar_shows', { artista: 'budang', limite: 3 })).texto);
console.log('listar_shows budang:', shows.map((s) => `${s.data} ${s.cidade} ${s.combinado}`).join(' | '));

const artista = JSON.parse((await call(w, 'ver_artista', { artista: 'Molho Negro' })).texto);
console.log('ver_artista formação:', JSON.stringify(artista.formacao), '| campos proibidos presentes?', /cpf|rg|nascimento|restri/i.test(JSON.stringify(artista)));

const contratantes = JSON.parse((await call(w, 'buscar_contratantes', { uf: 'DF' })).texto);
console.log('buscar_contratantes DF:', contratantes.length, '| tem telefone na lista?', contratantes.some((c) => 'telefone' in c));

const novo = await call(w, 'criar_show', {
  artista: 'Maré Tardia', data: '2026-12-20', cidade: 'São Paulo', uf: 'SP', local: 'Hangar 110',
  modelo_combinado: 'FIXED', cache_reais: 3000, pagamento: 'data_combinada', data_pagamento: '2027-01-20', contrapartidas: ['FOOD', 'DRESSING_ROOM'],
});
const novoId = JSON.parse(novo.texto).id;
console.log('criar_show:', novo.erro ? novo.texto : `ok ${novoId}`);
const det = JSON.parse((await call(w, 'ver_show', { show_id: novoId })).texto);
console.log('ver_show pagamento:', JSON.stringify(det.pagamento), '| contrapartidas:', det.contrapartidas.join(', '));
console.log('atualizar_vendas:', (await call(w, 'atualizar_vendas', { show_id: novoId, vendidos: 42, fonte: 'PROMOTER' })).texto.replace(/\s+/g, ' '));
console.log('criar_tarefa delegada:', (await call(w, 'criar_tarefa', { titulo: 'Enviar ficha técnica ao Hangar', responsavel: 'Produção', prazo: '2026-12-10', show_id: novoId })).texto.replace(/\s+/g, ' '));
console.log('marcar pago (Carol é sócia):', (await call(w, 'financeiro_resumo')).erro ? 'erro' : 'resumo ok');
console.log('validação (pagamento combinado sem data):', (await call(w, 'atualizar_show', { show_id: novoId, pagamento: 'data_combinada', data_pagamento: undefined, modelo_combinado: 'FIXED' })).texto.slice(0, 80));

const r = await connect(readKey);
console.log('chave LEITURA tentando criar:', (await call(r, 'criar_tarefa', { titulo: 'x' })).texto);
console.log('chave LEITURA consultando:', (await call(r, 'listar_tarefas', { filtro: 'delegadas' })).erro ? 'erro' : 'ok');

try { await connect('gwos_chave_invalida'); console.log('chave inválida: CONECTOU (ruim)'); } catch (e) { console.log('chave inválida: recusada ->', String(e.message).slice(0, 90)); }
await w.close(); await r.close();
console.log(`NOVO_SHOW=${novoId}`);
