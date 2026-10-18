import { db } from "../db";
import { aiSettingsSchema, envSettings, type AiSettings } from "./settings";

const KEY = "ai";

/**
 * Saved settings from the database, else the environment. A missing table
 * (before `npm run db:setup`) or an invalid row falls back to the environment.
 */
export async function loadAiSettings(): Promise<
  AiSettings & { source: "saved" | "env" }
> {
  try {
    const row = await db.appSetting.findUnique({ where: { id: KEY } });
    const parsed = row ? aiSettingsSchema.safeParse(row.data) : null;
    if (parsed?.success) return { ...parsed.data, source: "saved" };
  } catch {
    // Table not created yet; use the environment.
  }
  return { ...envSettings(), source: "env" };
}

export async function saveAiSettings(settings: AiSettings) {
  const data = aiSettingsSchema.parse(settings);
  await db.appSetting.upsert({
    where: { id: KEY },
    create: { id: KEY, data },
    update: { data },
  });
  return data;
}

export async function resetAiSettings() {
  await db.appSetting.deleteMany({ where: { id: KEY } });
}
