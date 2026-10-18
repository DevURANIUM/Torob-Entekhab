import { afterEach, describe, expect, it, vi } from "vitest";
import { providerChain, resolveIntent } from "../lib/ai/provider";
import { estimateCost } from "../lib/ai/cost";
import { listModels } from "../lib/ai/models";
import {
  aiSettingsSchema,
  envSettings,
  type AiSettings,
} from "../lib/ai/settings";

const intent = {
  query: "q",
  brands: ["Samsung"],
  budget: { max: 120_000_000 },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const chatCompletion = (content: unknown) =>
  json({
    choices: [{ message: { content: JSON.stringify(content) } }],
    usage: { prompt_tokens: 100, completion_tokens: 20 },
  });

const claudeMessage = (
  content: unknown,
  stop_reason = "end_turn",
  extra: Record<string, unknown> = {},
) =>
  json({
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-opus-5-5",
    content: [{ type: "text", text: JSON.stringify(content) }],
    stop_reason,
    stop_sequence: null,
    usage: { input_tokens: 300, output_tokens: 50 },
    ...extra,
  });

type Route = (url: string, init: RequestInit) => Response | Promise<Response>;
function stubFetch(routes: Record<string, Route>) {
  const calls: { url: string; init: RequestInit }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const url = input instanceof Request ? input.url : String(input);
      calls.push({ url, init });
      const host = Object.keys(routes).find((h) => url.includes(h));
      if (!host) throw new Error(`unexpected ${url}`);
      return routes[host](url, init);
    }),
  );
  return calls;
}

const body = (init: RequestInit) => JSON.parse(String(init.body));
const header = (init: RequestInit, name: string) =>
  new Headers(init.headers).get(name);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("AI provider chain", () => {
  it("orders the named provider first, then AI_PROVIDERS", () => {
    vi.stubEnv("AI_MODE", "deepseek");
    vi.stubEnv("AI_PROVIDERS", "openai,claude");
    expect(providerChain()).toEqual(["deepseek", "openai", "claude"]);
    vi.stubEnv("AI_MODE", "auto");
    expect(providerChain()).toEqual(["openai", "claude"]);
    vi.stubEnv("AI_MODE", "mock");
    expect(providerChain()).toEqual([]);
  });

  it("asks Claude through the Anthropic API with structured output and fallbacks", async () => {
    vi.stubEnv("AI_MODE", "claude");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
    const calls = stubFetch({
      "api.anthropic.com": () => claudeMessage(intent),
    });
    const r = await resolveIntent("سامسونگ تا ۱۲۰ میلیون");
    expect(r.mode).toBe("claude");
    expect(r.fallback).toBe(false);
    expect(r.intent.brands).toEqual(["Samsung"]);
    expect(r.usage).toEqual({ input: 300, output: 50 });
    const sent = body(calls[0].init);
    expect(calls[0].url).toContain("/v1/messages");
    expect(sent.model).toBe("claude-opus-5-5");
    expect(sent.fallbacks).toBe("default");
    expect(sent.output_config.effort).toBe("low");
    expect(sent.output_config.format.type).toBe("json_schema");
    expect(header(calls[0].init, "anthropic-beta")).toContain(
      "server-side-fallback-2026-07-01",
    );
    expect(header(calls[0].init, "x-api-key")).toBe("sk-ant-test");
  });

  it("calls DeepSeek on its own endpoint, key and model", async () => {
    vi.stubEnv("AI_MODE", "deepseek");
    vi.stubEnv("DEEPSEEK_API_KEY", "ds-test");
    const calls = stubFetch({
      "api.deepseek.com": () => chatCompletion(intent),
    });
    const r = await resolveIntent("سامسونگ");
    expect(r.mode).toBe("deepseek");
    expect(calls[0].url).toBe("https://api.deepseek.com/chat/completions");
    expect(body(calls[0].init).model).toBe("deepseek-flash");
    expect(body(calls[0].init).response_format).toEqual({
      type: "json_object",
    });
    expect(header(calls[0].init, "authorization")).toBe("Bearer ds-test");
  });

  it("falls through to the next configured provider and records why", async () => {
    vi.stubEnv("AI_MODE", "claude");
    vi.stubEnv("AI_PROVIDERS", "claude,deepseek,openai");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    stubFetch({
      "api.anthropic.com": () =>
        json(
          {
            type: "error",
            error: { type: "authentication_error", message: "bad key" },
          },
          401,
        ),
      "api.openai.com": () => chatCompletion(intent),
    });
    const r = await resolveIntent("سامسونگ");
    expect(r.mode).toBe("openai");
    expect(r.fallback).toBe(true);
    expect(r.attempts.map((a) => a.id)).toEqual(["claude", "deepseek"]);
    expect(r.attempts[1].error).toBe("no API key");
  });

  it("treats a Claude refusal as a failure, not an intent", async () => {
    vi.stubEnv("AI_MODE", "claude");
    vi.stubEnv("AI_PROVIDERS", "claude");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
    stubFetch({
      "api.anthropic.com": () =>
        claudeMessage({}, "refusal", {
          content: [],
          stop_details: { type: "refusal", category: null, explanation: null },
        }),
    });
    const r = await resolveIntent("تا ۲۵ میلیون");
    expect(r.mode).toBe("mock");
    expect(r.fallback).toBe(true);
    expect(r.attempts[0].error).toContain("declined");
    expect(r.intent.budget?.max).toBe(25_000_000);
  });

  it("uses local extraction when every provider fails", async () => {
    vi.stubEnv("AI_MODE", "auto");
    vi.stubEnv("ANTHROPIC_API_KEY", "a");
    vi.stubEnv("OPENAI_API_KEY", "b");
    vi.stubEnv("DEEPSEEK_API_KEY", "c");
    stubFetch({
      "api.anthropic.com": () =>
        json(
          {
            type: "error",
            error: { type: "invalid_request_error", message: "x" },
          },
          400,
        ),
      "api.openai.com": () => json({}, 500),
      "api.deepseek.com": () =>
        chatCompletion({ query: "x", brands: ["Imaginary"] }),
    });
    const r = await resolveIntent("سامسونگ");
    expect(r.mode).toBe("mock");
    // Three services answered badly; Gemini and OpenRouter have no key.
    expect(r.attempts.map((x) => x.error === "no API key")).toEqual([
      false,
      false,
      false,
      true,
      true,
    ]);
    // DeepSeek's invented brand is rejected by the schema, never trusted.
    expect(r.intent.brands).toEqual(["Samsung"]);
  });
});

describe("AI cost", () => {
  it("knows the default Claude price and needs rates for the rest", () => {
    expect(estimateCost("claude", { input: 1e6, output: 1e6 })).toBe(24);
    expect(estimateCost("deepseek", { input: 1000, output: 1000 })).toBeNull();
    vi.stubEnv("DEEPSEEK_INPUT_COST_PER_MILLION", "0.5");
    vi.stubEnv("DEEPSEEK_OUTPUT_COST_PER_MILLION", "2");
    expect(estimateCost("deepseek", { input: 1e6, output: 1e6 })).toBe(2.5);
    expect(estimateCost("mock", { input: 5, output: 5 })).toBe(0);
  });
});

describe("Gemini, OpenRouter and saved settings", () => {
  const settings = (patch: Partial<AiSettings>): AiSettings => ({
    ...envSettings(),
    ...patch,
  });

  it("calls Gemini on its OpenAI-compatible endpoint", async () => {
    vi.stubEnv("GEMINI_API_KEY", "g-test");
    const calls = stubFetch({
      "generativelanguage.googleapis.com": () => chatCompletion(intent),
    });
    const r = await resolveIntent(
      "سامسونگ",
      undefined,
      settings({ mode: "gemini" }),
    );
    expect(r.mode).toBe("gemini");
    expect(r.model).toBe("gemini-3.8-flash");
    expect(calls[0].url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    );
    expect(header(calls[0].init, "authorization")).toBe("Bearer g-test");
  });

  it("calls OpenRouter with the chosen model and attribution header", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "or-test");
    const calls = stubFetch({
      "openrouter.ai": () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: "```json\n" + JSON.stringify(intent) + "\n```",
                },
              },
            ],
          }),
          { headers: { "content-type": "application/json" } },
        ),
    });
    const r = await resolveIntent(
      "سامسونگ",
      undefined,
      settings({
        mode: "openrouter",
        models: { openrouter: "anthropic/claude-opus-5.5" },
      }),
    );
    expect(r.mode).toBe("openrouter");
    expect(r.model).toBe("anthropic/claude-opus-5.5");
    expect(body(calls[0].init).model).toBe("anthropic/claude-opus-5.5");
    expect(header(calls[0].init, "x-openrouter-title")).toBe("Torob Entekhab");
    // A fenced JSON reply is unwrapped, not rejected.
    expect(r.intent.brands).toEqual(["Samsung"]);
  });

  it("uses the saved model and order instead of the environment", async () => {
    vi.stubEnv("OPENAI_MODEL", "gpt-env");
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.stubEnv("DEEPSEEK_API_KEY", "ds-test");
    const calls = stubFetch({
      "api.deepseek.com": () => json({}, 503),
      "api.openai.com": () => chatCompletion(intent),
    });
    const r = await resolveIntent(
      "سامسونگ",
      undefined,
      settings({
        mode: "auto",
        order: ["deepseek", "openai"],
        models: { openai: "gpt-4.1" },
      }),
    );
    expect(calls.map((c) => new URL(c.url).host)).toEqual([
      "api.deepseek.com",
      "api.openai.com",
    ]);
    expect(body(calls[1].init).model).toBe("gpt-4.1");
    expect(r.model).toBe("gpt-4.1");
    expect(r.fallback).toBe(true);
  });

  it("validates settings before they are saved", () => {
    const valid = {
      ...envSettings(),
      mode: "gemini",
      models: { gemini: "gemini-3.8-flash" },
    };
    expect(aiSettingsSchema.safeParse(valid).success).toBe(true);
    expect(
      aiSettingsSchema.safeParse({ ...valid, mode: "skynet" }).success,
    ).toBe(false);
    expect(
      aiSettingsSchema.safeParse({
        ...valid,
        models: { gemini: "x; rm -rf /" },
      }).success,
    ).toBe(false);
    // No place for secrets: unknown fields are rejected.
    expect(aiSettingsSchema.safeParse({ ...valid, apiKey: "sk" }).success).toBe(
      false,
    );
  });

  it("lists OpenRouter models that accept a JSON response format", async () => {
    stubFetch({
      "openrouter.ai": () =>
        json({
          data: [
            {
              id: "b/json-model",
              name: "B",
              supported_parameters: ["response_format"],
            },
            { id: "a/plain-model", name: "A", supported_parameters: ["tools"] },
          ],
        }),
    });
    const list = await listModels("openrouter");
    expect(list.live).toBe(true);
    expect(list.models.map((m) => m.id)).toEqual(["b/json-model"]);
  });

  it("falls back to suggested models when a list cannot be read", async () => {
    const list = await listModels("gemini");
    expect(list.live).toBe(false);
    expect(list.error).toBe("no API key");
    expect(list.models[0].id).toBe("gemini-3.8-flash");
  });
});
