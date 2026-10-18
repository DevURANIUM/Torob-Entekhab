import { SearchIntent } from "../domain";
import { extractIntent } from "./extract-intent";
import { explainRecommendation } from "./explain";
import { Ranked } from "../search/ranking";
import { ClaudeProvider } from "./providers/claude";
import { OpenAICompatibleProvider } from "./providers/openai-compatible";
import {
  providerIds,
  type ProviderId,
  type RemoteProvider,
  type Usage,
} from "./providers/types";
import { apiKeyOf, baseUrlOf, env, providerCatalog } from "./catalog";
import {
  envSettings,
  modelOf,
  providerChain,
  type AiSettings,
} from "./settings";

export { providerIds, type ProviderId } from "./providers/types";
export { providerChain } from "./settings";

export interface AIProvider {
  extractIntent(query: string): Promise<SearchIntent>;
  refineIntent(query: string, previous: SearchIntent): Promise<SearchIntent>;
  explainRecommendation(r: Ranked): string[];
}

/** Local rule-based extraction; always available and the final fallback. */
export class MockAIProvider implements AIProvider {
  async extractIntent(query: string) {
    return extractIntent(query);
  }
  async refineIntent(query: string, previous: SearchIntent) {
    return extractIntent(query, previous);
  }
  explainRecommendation = explainRecommendation;
}

const timeoutMs = () => Number(env("AI_TIMEOUT_MS") ?? 15000);

/** The provider for an id, or null when its API key is not configured. */
export function createProvider(
  id: ProviderId,
  settings: AiSettings = envSettings(),
): RemoteProvider | null {
  const apiKey = apiKeyOf(id);
  if (!apiKey) return null;
  const model = modelOf(settings, id);
  if (id === "claude")
    return new ClaudeProvider({
      apiKey,
      model,
      effort: settings.claudeEffort,
      timeoutMs: timeoutMs(),
      baseUrl: env("ANTHROPIC_BASE_URL"),
    });
  return new OpenAICompatibleProvider({
    id,
    apiKey,
    model,
    baseUrl: baseUrlOf(id),
    timeoutMs: timeoutMs(),
    // OpenRouter's optional attribution headers.
    headers:
      id === "openrouter"
        ? {
            ...(env("OPENROUTER_SITE_URL")
              ? { "HTTP-Referer": env("OPENROUTER_SITE_URL")! }
              : {}),
            "X-OpenRouter-Title":
              env("OPENROUTER_APP_NAME") ?? "Torob Entekhab",
          }
        : undefined,
  });
}

/** Per-provider state for the lab and the settings page. */
export function providerStatus(settings: AiSettings = envSettings()) {
  const chain = providerChain(settings);
  return providerIds.map((id) => ({
    id,
    label: providerCatalog[id].label,
    configured: Boolean(apiKeyOf(id)),
    model: modelOf(settings, id),
    defaultModel: providerCatalog[id].defaultModel,
    position: chain.indexOf(id),
    keyEnv: `${providerCatalog[id].envPrefix}_API_KEY`,
    keyUrl: providerCatalog[id].keyUrl,
  }));
}

export type Extraction = {
  intent: SearchIntent;
  /** The service that produced the intent: a provider id, or `mock`. */
  mode: ProviderId | "mock";
  /** The model that answered, when a remote service did. */
  model: string | null;
  /** True when the first-choice service did not produce the intent. */
  fallback: boolean;
  usage: Usage;
  /** Services tried before the one that answered, with why each failed. */
  attempts: { id: ProviderId; error: string }[];
};

export async function resolveIntent(
  query: string,
  previous?: SearchIntent,
  settings: AiSettings = envSettings(),
): Promise<Extraction> {
  const chain = providerChain(settings);
  const attempts: Extraction["attempts"] = [];
  for (const id of chain) {
    const provider = createProvider(id, settings);
    if (!provider) {
      attempts.push({ id, error: "no API key" });
      continue;
    }
    try {
      const intent = await provider.extract(query, previous);
      return {
        intent,
        mode: id,
        model: provider.model,
        fallback: id !== chain[0],
        usage: provider.usage,
        attempts,
      };
    } catch (e) {
      attempts.push({
        id,
        error: e instanceof Error ? e.message.slice(0, 200) : "failed",
      });
    }
  }
  return {
    intent: extractIntent(query, previous),
    mode: "mock",
    model: null,
    fallback: chain.length > 0,
    usage: { input: 0, output: 0 },
    attempts,
  };
}
