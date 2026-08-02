import { describe, expect, it } from 'vitest';
import { redactPayload } from '../redact.ts';

describe('redactPayload', () => {
  it('drops every key not on the allowlist', () => {
    const out = redactPayload({ name: 'Yusuf Aydin', fileName: 'Kontoauszug.pdf', dw: 3 });
    expect(out).toEqual({ dw: 3 });
  });

  it('never lets an IBAN, an email, or a name survive — including nested and array payloads', () => {
    const payload = {
      f: 'accountField',
      reason: 'IBAN DE89370400440532013000, contact yusuf.aydin@example.com',
      nested: { f: 'x', reason: 'Maria Kessler lives at Hauptstr. 1' },
      list: ['DE89370400440532013000', 'maria.k@example.com', 'ok-bucket-3'],
    };
    const out = redactPayload(payload);
    const text = JSON.stringify(out);
    expect(text).not.toMatch(/DE89370400440532013000/);
    expect(text).not.toMatch(/@example\.com/);
    expect(text).not.toMatch(/Yusuf|Maria|Kessler|Aydin/);
  });

  it('omits empty, false, and zero fields entirely rather than keeping them', () => {
    const out = redactPayload({ dw: 0, ok: false, id: '', n: 3 });
    expect(out).toEqual({ n: 3 });
  });

  it('drops overlong strings even on an allowed key (defense in depth)', () => {
    const out = redactPayload({ reason: 'x'.repeat(200) });
    expect(out).toEqual({});
  });

  it('keeps short, allowlisted, non-empty values untouched', () => {
    const out = redactPayload({ f: 'iban', ec: 'REQUIRED', n: 2, ok: true });
    expect(out).toEqual({ f: 'iban', ec: 'REQUIRED', n: 2, ok: true });
  });

  it('drops unsupported value types (functions, symbols) instead of throwing', () => {
    const out = redactPayload({ id: () => {}, n: 1 } as unknown as Record<string, unknown>);
    expect(out).toEqual({ n: 1 });
  });
});
