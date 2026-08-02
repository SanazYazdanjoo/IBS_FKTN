/**
 * Allowlist-based payload scrubber — the single enforcement point for the
 * "no personal data in the log, ever" constraint. Anything not explicitly
 * allowed is dropped, not passed through. This runs on every payload right
 * before it's buffered, regardless of which call site produced it, so a
 * mistake at one call site can never leak a field the allowlist doesn't
 * name.
 *
 * Two independent layers, both must pass:
 *  1. Key allowlist (PAYLOAD_KEY_ALLOWLIST) — a field is only kept if its
 *     identifier is a known, documented shape/enum/bucket key.
 *  2. Content guard — even an allowed key is dropped if its *value* looks
 *     like it slipped free text through (email, IBAN, or an overlong
 *     string), as defense in depth against a future call site that reuses
 *     an allowed key name for the wrong thing.
 */
import { PAYLOAD_KEY_ALLOWLIST } from './events.ts';

// Positive allowlist for the *shape* of a value, not just its length: every payload
// string is a bucket label, enum member, mime type, or element/field id — none of
// those ever contain a space, an "@", or run past a couple dozen characters. Free
// text (names, addresses, notes) fails this check by construction, not by pattern-
// matching specific PII formats after the fact.
const SAFE_TOKEN_RE = /^[A-Za-z0-9_\-./]{1,32}$/;
// Belt-and-suspenders: an IBAN is itself alphanumeric and would pass the token
// shape check above, so it needs its own explicit rejection.
const IBAN_RE = /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/;

export interface RedactStats {
  droppedKeys: number;
  droppedValues: number;
}

function looksLikeFreeText(value: string): boolean {
  if (!SAFE_TOKEN_RE.test(value)) return true;
  if (IBAN_RE.test(value.toUpperCase())) return true;
  return false;
}

function isEmptyValue(value: unknown): boolean {
  return value === '' || value === false || value === 0 || value === null || value === undefined;
}

/** Redacts a single value that already passed the key check (or has no key, e.g. array elements). */
function redactValue(value: unknown, stats: RedactStats): unknown {
  if (typeof value === 'string') {
    if (looksLikeFreeText(value)) {
      stats.droppedValues += 1;
      return undefined;
    }
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    const out = value
      .map((v) => redactValue(v, stats))
      .filter((v) => v !== undefined);
    return out;
  }
  if (typeof value === 'object' && value !== null) {
    return redactPayload(value as Record<string, unknown>, stats);
  }
  // Unknown/unsupported type (function, symbol, bigint, undefined) — drop.
  stats.droppedValues += 1;
  return undefined;
}

/**
 * Redacts a payload object: keeps only allowlisted keys with safe,
 * non-empty values. Recurses into nested objects/arrays so an accidental
 * nested personal-data field can't survive either.
 */
export function redactPayload(
  payload: Record<string, unknown>,
  stats: RedactStats = { droppedKeys: 0, droppedValues: 0 },
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(payload)) {
    if (!PAYLOAD_KEY_ALLOWLIST.has(key)) {
      stats.droppedKeys += 1;
      continue;
    }
    if (isEmptyValue(raw)) continue; // omit empty/false/zero fields entirely — not a privacy drop
    const value = redactValue(raw, stats);
    if (value === undefined) continue;
    if (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === 0) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[key] = value as string | number | boolean;
  }
  return out;
}
