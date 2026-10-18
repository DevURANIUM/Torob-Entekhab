import { NextResponse } from "next/server";
import { providerIds, type ProviderId } from "@/lib/ai/provider";
import { listModels } from "@/lib/ai/models";
import { error, rateLimit } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (rateLimit(request, 60)) return error("کمی صبر کن و دوباره تلاش کن.", 429);
  const id = new URL(request.url).searchParams.get("provider");
  if (!providerIds.includes(id as ProviderId))
    return error("سرویس نامعتبر است.");
  return NextResponse.json(await listModels(id as ProviderId));
}
