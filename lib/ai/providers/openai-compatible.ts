import { z } from "zod";
import { intentSchema, SearchIntent } from "../../domain";
import { intentInstructions } from "../instructions";
import type { ProviderId, RemoteProvider, Usage } from "./types";

const responseSchema = z.object({
  choices: z
    .array(z.object({ message: z.object({ content: z.string() }) }))
    .min(1),
  usage: z
    .object({ prompt_tokens: z.number(), completion_tokens: z.number() })
    .optional(),
});

export type OpenAICompatibleConfig = {
  id: Exclude<ProviderId, "claude">;
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  headers?: Record<string, string>;
};

/**
 * Chat Completions in JSON mode. OpenAI, DeepSeek, Gemini and OpenRouter
 * share this wire format; only the endpoint, key, model and headers differ.
 */
export class OpenAICompatibleProvider implements RemoteProvider {
  usage: Usage = { input: 0, output: 0 };
  constructor(readonly config: OpenAICompatibleConfig) {}
  get id() {
    return this.config.id;
  }
  get model() {
    return this.config.model;
  }

  async extract(query: string, previous?: SearchIntent) {
    const { baseUrl, apiKey, model, timeoutMs, headers } = this.config;
    const response = await fetch(
      `${baseUrl.replace(/\/$/, "")}/chat/completions`,
      {
        method: "POST",
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          ...headers,
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `${intentInstructions(previous)}\nReturn JSON matching this schema: ${JSON.stringify(z.toJSONSchema(intentSchema))}`,
            },
            { role: "user", content: query },
          ],
        }),
      },
    );
    if (!response.ok)
      throw new Error(`${this.id} unavailable (${response.status})`);
    const data = responseSchema.parse(await response.json());
    this.usage = {
      input: data.usage?.prompt_tokens ?? 0,
      output: data.usage?.completion_tokens ?? 0,
    };
    return intentSchema.parse(
      JSON.parse(stripFence(data.choices[0].message.content)),
    );
  }
}

/** Some models wrap JSON-mode output in a ```json fence; unwrap it. */
function stripFence(text: string) {
  const m = text.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return m ? m[1] : text;
}
