import type { ProviderId, Usage } from "./providers/types";
import { providerCatalog } from "./catalog";

// Published list prices of models whose cost should be known out of the box;
// any other model needs its rates configured.
const knownRates: Record<string, { input: number; output: number }> = {
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-fable-5-1": { input: 10, output: 50 },
};

/**
 * USD per million tokens: `<PREFIX>_INPUT/OUTPUT_COST_PER_MILLION`, then the
 * shared `AI_*` rates, then the known list price of the model.
 */
export function rates(id: ProviderId, model?: string | null) {
  const read = (name: string) => {
    const n = Number(process.env[name]);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const prefix = providerCatalog[id].envPrefix;
  const input =
    read(`${prefix}_INPUT_COST_PER_MILLION`) ??
    read("AI_INPUT_COST_PER_MILLION");
  const output =
    read(`${prefix}_OUTPUT_COST_PER_MILLION`) ??
    read("AI_OUTPUT_COST_PER_MILLION");
  if (input !== null && output !== null) return { input, output };
  const name = model ?? providerCatalog[id].defaultModel;
  return id === "claude" ? (knownRates[name] ?? null) : null;
}

/** Estimated USD cost of one call; null when the rates are unknown. */
export function estimateCost(
  id: ProviderId | "mock" | "edited",
  usage: Usage,
  model?: string | null,
) {
  if (id === "mock" || id === "edited") return 0;
  const r = rates(id, model);
  return r ? (usage.input * r.input + usage.output * r.output) / 1e6 : null;
}
