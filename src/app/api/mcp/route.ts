// Endpoint MCP (Streamable HTTP, sem sessão): https://SEU-APP/api/mcp
// Autenticação: Authorization: Bearer gwos_… (chave pessoal gerada em Configurações).
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { authenticate, isFailure } from '@/lib/mcp/tokens';
import { buildMcpServer } from '@/lib/mcp/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function jsonRpcError(status: number, message: string) {
  return new Response(JSON.stringify({ jsonrpc: '2.0', error: { code: status === 429 ? -32029 : -32001, message }, id: null }), {
    status,
    headers: { 'Content-Type': 'application/json', ...(status === 401 ? { 'WWW-Authenticate': 'Bearer realm="greenwaves-os"' } : {}) },
  });
}

async function handle(req: Request) {
  const ctx = await authenticate(req.headers.get('authorization'));
  if (isFailure(ctx)) return jsonRpcError(ctx.status, ctx.message);

  const origin = process.env.APP_URL?.replace(/\/$/, '') || new URL(req.url).origin;
  const server = buildMcpServer(ctx, origin);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  // modo sem sessão: cada requisição tem seu próprio servidor, descartado em seguida
  await server.connect(transport);
  return transport.handleRequest(req);
}

export const POST = handle;
export const GET = handle;
export const DELETE = handle;
