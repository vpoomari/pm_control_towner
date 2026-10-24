// PM CONTROL TOWER — AI BYOK shared contracts (client-safe, zero runtime deps)
// Types + provider registry + response parsing shared by the server actions and
// the client components. This module must stay import-safe from the browser.

export type AiProviderId = "gemini" | "openai" | "groq";

export interface AiProviderSpec {
  id: AiProviderId;
  label: string;
  /** Model used when the saved connector does not override it. */
  defaultModel: string;
  /** URL where the user can mint a key for this provider. */
  keyUrl: string;
  /** Short human hint of the key shape (format sanity only, never validated strictly). */
  keyHint: string;
}

/** Registry of supported providers — add an entry + a provider adapter to extend. */
export const AI_PROVIDERS: Record<AiProviderId, AiProviderSpec> = {
  gemini: {
    id: "gemini",
    label: "Google Gemini",
    defaultModel: "gemini-2.5-flash",
    keyUrl: "https://aistudio.google.com/apikey",
    keyHint: "starts with AIza…",
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    defaultModel: "gpt-4o-mini",
    keyUrl: "https://platform.openai.com/api-keys",
    keyHint: "starts with sk-…",
  },
  groq: {
    id: "groq",
    label: "Groq",
    defaultModel: "llama-3.3-70b-versatile",
    keyUrl: "https://console.groq.com/keys",
    keyHint: "starts with gsk_…",
  },
};

export const AI_PROVIDER_IDS = Object.keys(AI_PROVIDERS) as AiProviderId[];

export function isAiProviderId(value: string): value is AiProviderId {
  return (AI_PROVIDER_IDS as string[]).includes(value);
}

/**
 * Machine-readable outcome of an AI call. "ok" means the model answered;
 * every other value maps 1:1 to a graceful fallback string shown to the user
 * instead of an exception.
 */
export type AIStatus =
  | "ok"
  | "unauthenticated"
  | "forbidden"
  | "no_key"
  | "auth"
  | "rate_limit"
  | "timeout"
  | "network"
  | "bad_request"
  | "server"
  | "invalid_response";

export interface AIResult {
  status: AIStatus;
  /** Answer text on success, otherwise the graceful fallback message. */
  text: string;
  /** true when the provider failed and `text` is a fallback. */
  fallback: boolean;
  provider?: string;
  model?: string;
  durationMs?: number;
}

/** Settings status returned to the UI — NEVER contains raw key material. */
export interface AiSettingsStatus {
  configured: boolean;
  provider: AiProviderId | null;
  model: string | null;
  /** Masked view of the stored key, e.g. "••••••••abcd" — last 4 chars only. */
  maskedKey: string | null;
  lastUsedAt: string | null;
  usageCount: number;
  vaultReady: boolean;
}

/**
 * Pull a JSON array of strings out of a model response that may wrap it in
 * prose or ```json fences. Returns null when nothing parseable is found.
 */
export function extractJsonArray(text: string): string[] | null {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = [fenced?.[1], text];
  for (const raw of candidates) {
    if (!raw) continue;
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    if (start === -1 || end <= start) continue;
    try {
      const parsed: unknown = JSON.parse(raw.slice(start, end + 1));
      if (Array.isArray(parsed)) {
        const items = parsed.map((p) =>
          typeof p === "string" ? p : typeof p === "object" && p !== null && "title" in p
            ? String((p as { title: unknown }).title)
            : typeof p === "object" && p !== null && "text" in p
              ? String((p as { text: unknown }).text)
              : null
        );
        if (items.length > 0 && items.every((i) => typeof i === "string" && i.trim())) {
          return items as string[];
        }
      }
    } catch {
      // try the next candidate slice
    }
  }
  return null;
}
