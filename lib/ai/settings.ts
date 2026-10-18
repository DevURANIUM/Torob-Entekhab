import { z } from "zod";
import { providerIds, type ProviderId } from "./providers/types";
import { env, providerCatalog } from "./catalog";

export const aiModes = ["mock", "auto", ...providerIds] as const;
export const claudeEfforts = ["low", "medium", "high", "xhigh", "max"] as const;

const modelId = z
  .string()
  .trim()
  .max(200)
  .regex(/^[\w./:~@-]*$/, "شناسه مدل معتبر نیست");

/**
 * What the settings page controls. API keys are deliberately not here: they
 * stay in the server environment and never reach the page or the database.
 */
export const aiSettingsSchema = z
  .object({
    mode: z.enum(aiModes),
    order: z.array(z.enum(providerIds)).max(providerIds.length),
    models: z.object(
      Object.fromEntries(
        providerIds.map((id) => [id, modelId.optional()]),
      ) as Record<ProviderId, z.ZodOptional<typeof modelId>>,
    ),
    claudeEffort: z.enum(claudeEfforts),
  })
  .strict();
export type AiSettings = z.infer<typeof aiSettingsSchema>;

const isProvider = (x: string): x is ProviderId =>
  providerIds.includes(x as ProviderId);

/** Settings from environment variables, used until the page saves its own. */
export function envSettings(): AiSettings {
  const mode = env("AI_MODE") ?? "mock";
  const order = (env("AI_PROVIDERS") ?? providerIds.join(","))
    .split(",")
    .map((x) => x.trim())
    .filter(isProvider);
  const effort = env("ANTHROPIC_EFFORT");
  return {
    mode: (aiModes as readonly string[]).includes(mode)
      ? (mode as AiSettings["mode"])
      : "mock",
    order: order.length ? [...new Set(order)] : [...providerIds],
    models: Object.fromEntries(
      providerIds.map((id) => [
        id,
        env(`${providerCatalog[id].envPrefix}_MODEL`),
      ]),
    ) as AiSettings["models"],
    claudeEffort: (claudeEfforts as readonly string[]).includes(effort ?? "")
      ? (effort as AiSettings["claudeEffort"])
      : "low",
  };
}

/** The model a provider will use: the chosen one, else its default. */
export const modelOf = (settings: AiSettings, id: ProviderId) =>
  settings.models[id] || providerCatalog[id].defaultModel;

/** Providers to try, in order: the chosen first service, then the rest. */
export function providerChain(
  settings: AiSettings = envSettings(),
): ProviderId[] {
  if (settings.mode === "mock") return [];
  const first = isProvider(settings.mode) ? [settings.mode] : [];
  const rest = settings.order.length ? settings.order : providerIds;
  return [...new Set([...first, ...rest])];
}
