import { z } from "zod";
import { NextResponse } from "next/server";
import { createProvider, providerIds } from "@/lib/ai/provider";
import { aiSettingsSchema, claudeEfforts } from "@/lib/ai/settings";
import { loadAiSettings } from "@/lib/ai/settings-store";
import { estimateCost } from "@/lib/ai/cost";
import { canManageAi } from "@/lib/ai/guard";
import { body, error, rateLimit } from "@/lib/server";

export const dynamic = "force-dynamic";

const SAMPLE = "برای مامانم گوشی سامسونگ تا ۱۰۰ میلیون می‌خوام، باتری مهمه";

const schema = z.object({
  provider: z.enum(providerIds),
  model: aiSettingsSchema.shape.models.shape.claude,
  claudeEffort: z.enum(claudeEfforts).optional(),
});

/** One real call to one service with the model being edited; costs tokens. */
export async function POST(request: Request) {
  if (rateLimit(request, 10)) return error("کمی صبر کن و دوباره تلاش کن.", 429);
  if (!canManageAi(request)) return error("اجازه امتحان سرویس را نداری.", 403);
  let input: z.infer<typeof schema>;
  try {
    input = schema.parse(await body(request));
  } catch {
    return error("درخواست معتبر نیست.");
  }
  const saved = await loadAiSettings();
  const settings = {
    ...saved,
    models: { ...saved.models, [input.provider]: input.model || undefined },
    claudeEffort: input.claudeEffort ?? saved.claudeEffort,
  };
  const provider = createProvider(input.provider, settings);
  if (!provider)
    return NextResponse.json({
      ok: false,
      error: "کلید API این سرویس تنظیم نشده.",
    });
  const start = performance.now();
  try {
    const intent = await provider.extract(SAMPLE);
    return NextResponse.json({
      ok: true,
      model: provider.model,
      latency: Math.round(performance.now() - start),
      usage: provider.usage,
      cost: estimateCost(input.provider, provider.usage, provider.model),
      sample: SAMPLE,
      intent: {
        budget: intent.budget?.max ?? null,
        brands: intent.brands,
        recipient: intent.recipient ?? null,
        priorities: intent.priorities,
      },
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      model: provider.model,
      latency: Math.round(performance.now() - start),
      error: e instanceof Error ? e.message.slice(0, 200) : "failed",
    });
  }
}
