import type { ProviderId } from "./providers/types";

export type ProviderInfo = {
  id: ProviderId;
  label: string;
  /** Prefix of this provider's environment variables (`<PREFIX>_API_KEY`, …). */
  envPrefix: string;
  /** Wire format: Anthropic's Messages API, or OpenAI-style Chat Completions. */
  api: "anthropic" | "openai-compatible";
  defaultBaseUrl: string;
  defaultModel: string;
  /** Shown when the provider's live model list cannot be read. */
  suggestions: string[];
  keyUrl: string;
};

// One registry for every service, read by the provider factory, the cost
// estimator, the model list and the settings page.
export const providerCatalog: Record<ProviderId, ProviderInfo> = {
  claude: {
    id: "claude",
    label: "Claude (Anthropic)",
    envPrefix: "ANTHROPIC",
    api: "anthropic",
    defaultBaseUrl: "https://api.anthropic.com",
    defaultModel: "claude-opus-5-5",
    suggestions: [
      "claude-opus-5-5",
      "claude-sonnet-5-5",
      "claude-haiku-5-5",
      "claude-fable-5-1",
    ],
    keyUrl: "https://platform.claude.com/settings/keys",
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    envPrefix: "OPENAI",
    api: "openai-compatible",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4.1-mini",
    suggestions: ["gpt-4.1-mini", "gpt-4.1"],
    keyUrl: "https://platform.openai.com/api-keys",
  },
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    envPrefix: "DEEPSEEK",
    api: "openai-compatible",
    defaultBaseUrl: "https://api.deepseek.com",
    defaultModel: "deepseek-flash",
    suggestions: ["deepseek-flash", "deepseek-v4-pro"],
    keyUrl: "https://platform.deepseek.com/api_keys",
  },
  gemini: {
    id: "gemini",
    label: "Gemini (Google)",
    envPrefix: "GEMINI",
    api: "openai-compatible",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-3.8-flash",
    suggestions: ["gemini-3.8-flash"],
    keyUrl: "https://aistudio.google.com/apikey",
  },
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    envPrefix: "OPENROUTER",
    api: "openai-compatible",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "google/gemini-3.8-flash",
    suggestions: [
      "google/gemini-3.8-flash",
      "anthropic/claude-opus-5.5",
      "deepseek/deepseek-v4.1-flash",
    ],
    keyUrl: "https://openrouter.ai/settings/keys",
  },
};

export const env = (name: string) => process.env[name]?.trim() || undefined;
export const apiKeyOf = (id: ProviderId) =>
  env(`${providerCatalog[id].envPrefix}_API_KEY`);
export const baseUrlOf = (id: ProviderId) =>
  (
    env(`${providerCatalog[id].envPrefix}_BASE_URL`) ??
    providerCatalog[id].defaultBaseUrl
  ).replace(/\/$/, "");
