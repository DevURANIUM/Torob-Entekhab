// Minimal client for torob-mcp (https://github.com/mmdju/torob-mcp) over its
// stateless Streamable HTTP transport: one JSON-RPC POST per tool call.
import type {
  TorobHistory,
  TorobProductDetails,
  TorobSearchResult,
} from "./types";

export const DEFAULT_TOROB_MCP_URL = "https://torob-mcp.mmdju3.workers.dev/mcp";

export class TorobError extends Error {
  constructor(
    message: string,
    readonly kind: "network" | "upstream" | "rate-limit" | "protocol",
  ) {
    super(message);
  }
}

const endpoint = () => process.env.TOROB_MCP_URL || DEFAULT_TOROB_MCP_URL;

// The transport answers with either plain JSON or a single SSE `message` event.
function parseRpc(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  const data = trimmed
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .join("");
  if (!data) throw new TorobError("Empty MCP response", "protocol");
  return JSON.parse(data);
}

let nextId = 1;

export async function callTool<T>(
  name: string,
  args: Record<string, unknown>,
  { timeoutMs = 15000 }: { timeoutMs?: number } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(endpoint(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: nextId++,
        method: "tools/call",
        params: { name, arguments: args },
      }),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (e) {
    throw new TorobError(
      e instanceof Error ? e.message : "Network error",
      "network",
    );
  }
  if (res.status === 429)
    throw new TorobError("torob-mcp rate limit", "rate-limit");
  if (!res.ok) throw new TorobError(`HTTP ${res.status}`, "upstream");
  const rpc = parseRpc(await res.text()) as {
    result?: { content?: { type: string; text?: string }[]; isError?: boolean };
    error?: { message: string };
  };
  if (rpc.error) throw new TorobError(rpc.error.message, "protocol");
  const text = rpc.result?.content?.find((c) => c.type === "text")?.text ?? "";
  if (rpc.result?.isError)
    throw new TorobError(
      text.slice(0, 300),
      /490|challenge|wait|minutes/i.test(text) ? "rate-limit" : "upstream",
    );
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new TorobError("Tool returned non-JSON text", "protocol");
  }
}

export const searchProducts = (
  query: string,
  options: { limit?: number; page?: number; sort?: string } = {},
) =>
  callTool<TorobSearchResult>("search_products", {
    query,
    limit: options.limit ?? 24,
    ...(options.page ? { page: options.page } : {}),
    ...(options.sort ? { sort: options.sort } : {}),
  });

export const productDetails = (prk: string, detailsUrl?: string) =>
  callTool<TorobProductDetails>("product_details", {
    prk,
    ...(detailsUrl ? { details_url: detailsUrl } : {}),
    max_offers: 6,
    max_in_person: 0,
  });

export const priceHistory = (prk: string, detailsUrl?: string) =>
  callTool<TorobHistory>("price_history", {
    prk,
    ...(detailsUrl ? { details_url: detailsUrl } : {}),
    months: 12,
  });
