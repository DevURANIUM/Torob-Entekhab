import { NextResponse } from "next/server";
const buckets = new Map<string, { count: number; expires: number }>();
export function rateLimit(request: Request, limit = 60) {
  const key = (request.headers.get("x-forwarded-for") ?? "local")
    .split(",")[0]
    .slice(0, 100);
  const now = Date.now();
  for (const [k, v] of buckets) if (v.expires < now) buckets.delete(k);
  const b = buckets.get(key) ?? { count: 0, expires: now + 60000 };
  b.count++;
  buckets.set(key, b);
  return b.count > limit;
}
export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
export async function body(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 16000)
    throw new Error("Too large");
  const text = await request.text();
  if (text.length > 16000) throw new Error("Too large");
  return JSON.parse(text) as unknown;
}
