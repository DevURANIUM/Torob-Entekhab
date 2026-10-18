import type { SearchIntent } from "../../domain";

export const providerIds = [
  "claude",
  "openai",
  "deepseek",
  "gemini",
  "openrouter",
] as const;
export type ProviderId = (typeof providerIds)[number];
export type Usage = { input: number; output: number };

/** A remote model that turns a Persian query into a validated intent. */
export interface RemoteProvider {
  readonly id: ProviderId;
  readonly model: string;
  /** Token usage of the last successful call. */
  usage: Usage;
  /** Throws on any failure; the caller falls back to the next provider. */
  extract(query: string, previous?: SearchIntent): Promise<SearchIntent>;
}
