import { z } from "zod";
import { NextResponse } from "next/server";
import { aiSettingsSchema } from "@/lib/ai/settings";
import {
  loadAiSettings,
  resetAiSettings,
  saveAiSettings,
} from "@/lib/ai/settings-store";
import { providerStatus } from "@/lib/ai/provider";
import { canManageAi } from "@/lib/ai/guard";
import { body, error, rateLimit } from "@/lib/server";

export const dynamic = "force-dynamic";

async function state() {
  const settings = await loadAiSettings();
  const { source, ...values } = settings;
  return { settings: values, source, providers: providerStatus(values) };
}

export async function GET() {
  return NextResponse.json(await state());
}

export async function PUT(request: Request) {
  if (rateLimit(request, 30)) return error("کمی صبر کن و دوباره تلاش کن.", 429);
  if (!canManageAi(request)) return error("اجازه تغییر تنظیمات را نداری.", 403);
  try {
    await saveAiSettings(aiSettingsSchema.parse(await body(request)));
    return NextResponse.json(await state());
  } catch (e) {
    return e instanceof z.ZodError || e instanceof SyntaxError
      ? error("تنظیمات معتبر نیست.")
      : error("ذخیره تنظیمات ممکن نشد؛ `npm run db:setup` را اجرا کن.", 503);
  }
}

export async function DELETE(request: Request) {
  if (!canManageAi(request)) return error("اجازه تغییر تنظیمات را نداری.", 403);
  try {
    await resetAiSettings();
  } catch {
    // Nothing saved yet.
  }
  return NextResponse.json(await state());
}
