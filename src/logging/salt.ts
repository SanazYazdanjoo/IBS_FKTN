/**
 * Per-installation salt for pseudonymous ids. Generated once, kept only in
 * this browser's localStorage — never committed, never synced, never sent
 * anywhere. Actor ids (aid) and participant ids referenced in domain events
 * (pid) are both salted hashes of the real id, so the log can correlate
 * "same person, different events" without ever storing who that person is.
 */
const SALT_KEY = 'ibs-log-salt-v1';

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function getOrCreateSalt(): string {
  try {
    const existing = localStorage.getItem(SALT_KEY);
    if (existing) return existing;
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const salt = toHex(bytes);
    localStorage.setItem(SALT_KEY, salt);
    return salt;
  } catch {
    // localStorage unavailable (private mode, quota) — fall back to a
    // session-only salt so hashing still works, just doesn't persist.
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return toHex(bytes);
  }
}

/** Salted SHA-256 of a raw id, truncated to 16 hex chars (64 bits) — enough to correlate within one installation, not enough to be a useful global identifier on its own. */
export async function hashPseudonymousId(rawId: string, salt: string = getOrCreateSalt()): Promise<string> {
  const enc = new TextEncoder().encode(`${salt}:${rawId}`);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return toHex(new Uint8Array(digest)).slice(0, 16);
}
