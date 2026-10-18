import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { ProviderId } from "./providers/types";
import { apiKeyOf, baseUrlOf, env, providerCatalog } from "./catalog";

export type ModelOption = { id: string; label?: string };
export type ModelList = {
  models: ModelOption[];
  /** False when the provider could not be asked; `models` are suggestions. */
  live: boolean;
  error?: string;
};

const TTL = 10 * 60 * 1000;
const cache = new Map<ProviderId, { at: number; value: ModelList }>();

const openAiList = z.object({ data: z.array(z.object({ id: z.string() })) });
const openRouterList = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      name: z.string().optional(),
      supported_parameters: z.array(z.string()).optional(),
    }),
  ),
});

// Models that cannot take a chat request returning JSON.
const notChat =
  /embed|image|imagen|veo|tts|audio|whisper|dall-e|moderation|transcribe|realtime|search|computer-use|aqa/i;

async function fetchJson(url: string, headers: Record<string, string>) {
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function readLive(id: ProviderId): Promise<ModelOption[]> {
  const key = apiKeyOf(id);
  if (id === "openrouter") {
    // OpenRouter's list is public; keep models that accept a JSON response format.
    const data = openRouterList.parse(
      await fetchJson(`${baseUrlOf(id)}/models`, {}),
    );
    return data.data
      .filter(
        (m) => m.supported_parameters?.includes("response_format") ?? true,
      )
      .map((m) => ({ id: m.id, label: m.name }));
  }
  if (!key) throw new Error("no API key");
  if (id === "claude") {
    const client = new Anthropic({
      apiKey: key,
      baseURL: env("ANTHROPIC_BASE_URL"),
      timeout: 10000,
      maxRetries: 0,
      fetch: (...args) => globalThis.fetch(...args),
    });
    const models: ModelOption[] = [];
    for await (const m of client.models.list())
      models.push({ id: m.id, label: m.display_name });
    return models;
  }
  const data = openAiList.parse(
    await fetchJson(`${baseUrlOf(id)}/models`, {
      Authorization: `Bearer ${key}`,
    }),
  );
  return data.data
    .map((m) => ({ id: m.id.replace(/^models\//, "") }))
    .filter((m) => !notChat.test(m.id));
}

/** The models a provider offers, cached; falls back to built-in suggestions. */
export async function listModels(id: ProviderId): Promise<ModelList> {
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  let value: ModelList;
  try {
    const models = await readLive(id);
    value = models.length
      ? { models: models.sort((a, b) => a.id.localeCompare(b.id)), live: true }
      : { models: suggestions(id), live: false, error: "empty list" };
  } catch (e) {
    value = {
      models: suggestions(id),
      live: false,
      error: e instanceof Error ? e.message.slice(0, 120) : "failed",
    };
  }
  // Failures are cached briefly so a missing key is not re-asked every request.
  cache.set(id, {
    at: value.live ? Date.now() : Date.now() - TTL + 60_000,
    value,
  });
  return value;
}

const suggestions = (id: ProviderId) =>
  providerCatalog[id].suggestions.map((m) => ({ id: m }));
