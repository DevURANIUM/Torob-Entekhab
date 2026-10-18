import { intentSchema, SearchIntent } from "./domain";
import { extractIntent } from "./ai/extract-intent";
export function readIntent(
  state: string | undefined,
  query = "",
): SearchIntent {
  try {
    return intentSchema.parse(JSON.parse(state ?? ""));
  } catch {
    return extractIntent(query);
  }
}
export const encodeIntent = (intent: SearchIntent) =>
  encodeURIComponent(JSON.stringify(intent));
