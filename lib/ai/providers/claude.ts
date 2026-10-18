import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { intentSchema, SearchIntent } from "../../domain";
import { intentInstructions } from "../instructions";
import type { RemoteProvider, Usage } from "./types";

type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export type ClaudeConfig = {
  apiKey: string;
  model: string;
  effort: Effort;
  timeoutMs: number;
  baseUrl?: string;
};

/**
 * Claude through the Anthropic SDK. Structured outputs constrain the reply to
 * the intent schema (the SDK strips numeric bounds it cannot send and checks
 * them locally), and server-side fallbacks retry a policy decline on the
 * model Anthropic recommends for that category.
 */
export class ClaudeProvider implements RemoteProvider {
  readonly id = "claude" as const;
  get model() {
    return this.config.model;
  }
  usage: Usage = { input: 0, output: 0 };
  private client: Anthropic;

  constructor(readonly config: ClaudeConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      timeout: config.timeoutMs,
      maxRetries: 1,
      // Resolved per call so tests can stub the global fetch.
      fetch: (...args) => globalThis.fetch(...args),
    });
  }

  async extract(query: string, previous?: SearchIntent) {
    const response = await this.client.beta.messages.parse({
      model: this.config.model,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // Short extraction: low effort keeps latency and cost down.
      output_config: {
        effort: this.config.effort,
        format: betaZodOutputFormat(intentSchema),
      },
      system: intentInstructions(previous),
      messages: [{ role: "user", content: query }],
    });
    if (response.stop_reason === "refusal")
      throw new Error(
        `claude declined (${response.stop_details?.category ?? "unknown"})`,
      );
    if (response.stop_reason === "max_tokens")
      throw new Error("claude output was cut off");
    if (!response.parsed_output) throw new Error("claude returned no intent");
    this.usage = {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
    };
    // Re-parse to apply the schema's defaults on top of the validated output.
    return intentSchema.parse(response.parsed_output);
  }
}
