import { z } from "zod";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { body, error, rateLimit } from "@/lib/server";
const schema = z.object({
  name: z.enum([
    "search_submitted",
    "intent_edited",
    "clarification_answered",
    "recommendation_opened",
    "why_clicked",
    "comparison_started",
    "followup_submitted",
    "budget_analysis_opened",
    "product_selected",
    "feedback",
  ]),
  value: z.string().max(100).optional(),
});
export async function POST(req: Request) {
  if (rateLimit(req, 180)) return error("Too many events", 429);
  try {
    const data = schema.parse(await body(req));
    await db.event.create({ data });
    return NextResponse.json({ ok: true });
  } catch {
    return error("Invalid event");
  }
}
