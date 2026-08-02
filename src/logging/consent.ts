/**
 * Consent gate: logging is off by default until the user explicitly opts
 * in, except in demo/seed mode (env === 'MOCK') where it defaults on so the
 * research team can evaluate the prototype itself. Revoking consent must
 * also delete what already exists — logger.ts wires that via onRevoke.
 */
import type { Env } from './schema.ts';

const CONSENT_KEY = 'ibs-log-consent-v1';
const RETENTION_DAYS = 90;

export type ConsentState = 'granted' | 'revoked' | 'unset';

interface ConsentRecord {
  state: 'granted' | 'revoked';
  at: string;
}

function read(): ConsentRecord | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    if (parsed.state === 'granted' || parsed.state === 'revoked') return parsed;
    return null;
  } catch {
    return null;
  }
}

function write(state: 'granted' | 'revoked'): void {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ state, at: new Date().toISOString() }));
  } catch {
    // No persistence available — consent simply won't survive a reload.
  }
}

export function getConsentState(): ConsentState {
  return read()?.state ?? 'unset';
}

/** Whether logging should actually run right now, folding in the demo default-on rule. */
export function isLoggingEnabled(env: Env): boolean {
  const state = getConsentState();
  if (state === 'granted') return true;
  if (state === 'revoked') return false;
  return env === 'MOCK';
}

export function grantConsent(): void {
  write('granted');
}

export function revokeConsent(): void {
  write('revoked');
}

export { RETENTION_DAYS };
