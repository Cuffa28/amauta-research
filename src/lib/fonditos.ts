/**
 * Cliente del servidor MCP de fonditos.ar (fuente de datos de FCIs).
 *
 * fonditos expone ~23 "tools" (funds/flow/commercial/aum/holdings) vía MCP
 * sobre HTTP. Soporta llamadas STATELESS: alcanza con POST tools/call + Bearer,
 * sin handshake de sesión. La respuesta viene como SSE (event: message / data: {...})
 * y trae `result.structuredContent` (JSON ya parseado) — eso devolvemos.
 *
 * Server-only: usa FONDITOS_API_KEY (secreta). Nunca importar desde el cliente.
 */

const MCP_URL = process.env.FONDITOS_MCP_URL || "https://mcp.fonditos.ar/mcp";
const API_KEY = process.env.FONDITOS_API_KEY;

export class FonditosError extends Error {}

export async function fonditos<T = unknown>(
  tool: string,
  args: Record<string, unknown> = {},
  opts: { revalidate?: number } = {}
): Promise<T> {
  if (!API_KEY) throw new FonditosError("Falta FONDITOS_API_KEY");

  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: tool, arguments: args },
    }),
    // Datos diarios: cacheamos por defecto 30 min salvo override.
    next: { revalidate: opts.revalidate ?? 1800 },
  });

  if (!res.ok) {
    throw new FonditosError(`${tool}: HTTP ${res.status}`);
  }

  const raw = await res.text();
  // La respuesta es SSE: buscamos la línea `data: {...}` con el JSON-RPC.
  const dataLine = raw
    .split(/\r?\n/)
    .find((l) => l.startsWith("data:"));
  const payload = dataLine ? dataLine.slice(5).trim() : raw;

  let json: {
    error?: { message?: string };
    result?: {
      isError?: boolean;
      structuredContent?: unknown;
      content?: Array<{ type: string; text?: string }>;
    };
  };
  try {
    json = JSON.parse(payload);
  } catch {
    throw new FonditosError(`${tool}: respuesta no parseable`);
  }

  if (json.error) throw new FonditosError(`${tool}: ${json.error.message}`);
  const result = json.result;
  if (result?.isError) {
    throw new FonditosError(`${tool}: ${result.content?.[0]?.text ?? "error"}`);
  }

  if (result?.structuredContent !== undefined) return result.structuredContent as T;
  const txt = result?.content?.[0]?.text;
  if (txt) {
    try {
      return JSON.parse(txt) as T;
    } catch {
      return txt as unknown as T;
    }
  }
  return result as unknown as T;
}
