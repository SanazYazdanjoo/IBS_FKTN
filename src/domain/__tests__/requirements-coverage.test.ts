/**
 * Guards Part 5 of the review-build hardening: every requirement id
 * (FR-.../NFR-...) and problem id (P-number, from the Phase 1 report) cited
 * in a code comment must have a row in REQUIREMENTS.md, so a new citation
 * can't silently go untracked.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, 'src');
const REQUIREMENTS_PATH = join(ROOT, 'REQUIREMENTS.md');

const EXCLUDE_DIRS = new Set(['node_modules']);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (EXCLUDE_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) out.push(full);
  }
  return out;
}

/** FR-01, NFR-01, P16, … — word-bounded so "P16" doesn't also match inside a longer token. */
const ID_RE = /\b(?:N?FR-\d+|P\d{1,2})\b/g;

function idsCitedInSource(): Set<string> {
  const ids = new Set<string>();
  for (const file of walk(SRC_DIR)) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(ID_RE)) ids.add(m[0]);
  }
  return ids;
}

describe('REQUIREMENTS.md coverage', () => {
  it('has a row for every FR-…/NFR-…/P… id cited in a code comment', () => {
    const requirementsText = readFileSync(REQUIREMENTS_PATH, 'utf8');
    const cited = [...idsCitedInSource()].sort();
    const missing = cited.filter((id) => !requirementsText.includes(id));
    expect(missing).toEqual([]);
  });

  it('cites at least the ids currently known (sanity floor, catches an empty/broken scan)', () => {
    const cited = idsCitedInSource();
    expect(cited.size).toBeGreaterThanOrEqual(15);
  });
});
