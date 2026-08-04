import { describe, expect, it } from 'vitest';
import { SUPPORTED_LOCALES, TRANSLATIONS } from '../translations';

/** Flattens nested string/function leaves into dotted key paths, so both locales can be compared key-for-key. */
function leafKeys(value: unknown, prefix = ''): string[] {
  if (typeof value === 'string' || typeof value === 'function') return [prefix];
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
      leafKeys(v, prefix ? `${prefix}.${k}` : k),
    );
  }
  return [prefix];
}

describe('TN flow translations', () => {
  it('ships exactly the supported locales', () => {
    expect(Object.keys(TRANSLATIONS).sort()).toEqual([...SUPPORTED_LOCALES].sort());
  });

  it('de and en cover the exact same set of keys — no locale silently missing a string', () => {
    const [first, ...rest] = SUPPORTED_LOCALES;
    const baseline = leafKeys(TRANSLATIONS[first]).sort();
    for (const locale of rest) {
      expect(leafKeys(TRANSLATIONS[locale]).sort()).toEqual(baseline);
    }
  });

  it('every string leaf is non-empty for every locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const key of leafKeys(TRANSLATIONS[locale])) {
        const parts = key.split('.');
        let node: unknown = TRANSLATIONS[locale];
        for (const part of parts) node = (node as Record<string, unknown>)[part];
        if (typeof node === 'string') expect(node.length, `${locale}.${key}`).toBeGreaterThan(0);
      }
    }
  });
});
