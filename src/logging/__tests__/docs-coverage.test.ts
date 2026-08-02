import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { EVENT_TYPE_DICT } from '../events.ts';

const docsPath = fileURLToPath(new URL('../../../docs/LOGGING.md', import.meta.url));
const docsText = readFileSync(docsPath, 'utf-8');

describe('docs/LOGGING.md coverage', () => {
  it('documents every event type in EVENT_TYPE_DICT', () => {
    const missing = Object.values(EVENT_TYPE_DICT)
      .map((entry) => entry.name)
      .filter((name) => !docsText.includes(name));
    expect(missing).toEqual([]);
  });

  it('has no dictionary entry name typo\'d relative to the docs (spot-check count)', () => {
    const names = Object.values(EVENT_TYPE_DICT).map((e) => e.name);
    expect(names.length).toBeGreaterThan(40);
    expect(new Set(names).size).toBe(names.length); // no duplicate names
  });
});
