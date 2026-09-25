import { z } from "zod";
import { NextResponse } from "next/server";
import { intentSchema } from "@/lib/domain";
import { db, getProducts } from "@/lib/db";
import { resolveIntent } from "@/lib/ai/provider";
import { search, marginalValueAnalysis } from "@/lib/search/engine";
import { body, error, rateLimit } from "@/lib/server";
const schema = z.object({
  query: z.string().trim().min(1).max(1000),
  previous: intentSchema.optional(),
  edited: intentSchema.optional(),
  upgrade: z.boolean().optional(),
  target: z.number().positive().max(1e10).optional(),
});
export async function POST(request: Request) {
  if (rateLimit(request)) return error("کمی صبر کن و دوباره تلاش کن.", 429);
  try {
    const input = schema.parse(await body(request));
    const start = performance.now();
    const extraction = input.edited
      ? {
          intent: input.edited,
          mode: "edited",
          fallback: false,
          usage: { input: 0, output: 0 },
        }
      : await resolveIntent(input.query, input.previous);
    const products = await getProducts();
    const result = search(products, extraction.intent);
    const latency = performance.now() - start;
    const inputRate = Number(process.env.AI_INPUT_COST_PER_MILLION);
    const outputRate = Number(process.env.AI_OUTPUT_COST_PER_MILLION);
    const estimatedCost =
      extraction.mode === "openai"
        ? inputRate > 0 && outputRate > 0
          ? (extraction.usage.input * inputRate +
              extraction.usage.output * outputRate) /
            1e6
          : null
        : 0;
    await db.aiRun.create({
      data: {
        mode: extraction.mode,
        fallback: extraction.fallback,
        latency,
        inputTokens: extraction.usage.input,
        outputTokens: extraction.usage.output,
        estimatedCost,
      },
    });
    return NextResponse.json({
      ...result,
      ...extraction,
      latency,
      estimatedCost,
      upgrade: input.upgrade
        ? marginalValueAnalysis(products, extraction.intent, input.target)
        : null,
    });
  } catch (e) {
    return error(
      e instanceof z.ZodError || e instanceof SyntaxError
        ? "ورودی معتبر نیست."
        : "دریافت داده ممکن نشد؛ دوباره تلاش کن.",
      e instanceof z.ZodError || e instanceof SyntaxError ? 400 : 503,
    );
  }
}
