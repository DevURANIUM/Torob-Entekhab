import { timingSafeEqual } from "node:crypto";

/**
 * Who may change AI settings or spend tokens on a test call. With
 * AI_SETTINGS_TOKEN set, requests must send it in `x-settings-token`;
 * without it, only a development server accepts changes.
 */
export function canManageAi(request: Request) {
  const token = process.env.AI_SETTINGS_TOKEN?.trim();
  if (!token) return process.env.NODE_ENV !== "production";
  const sent = request.headers.get("x-settings-token") ?? "";
  const a = Buffer.from(sent);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const settingsLocked = () =>
  !process.env.AI_SETTINGS_TOKEN?.trim() &&
  process.env.NODE_ENV === "production";
