/**
 * Guards Part 1 point 3 of the review-build hardening: no real person's
 * first/last name may appear anywhere in the repo. The one documented
 * exception is the read-only legacy Excel literal in values.ts (old
 * workbooks that still carry real staff first names in the Zustand cell) —
 * allowlisted explicitly below, by file, so a name showing up anywhere else
 * still fails this test.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();

const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'dist-review', 'build', 'coverage']);
const BINARY_EXTENSIONS = new Set([
  '.woff2', '.woff', '.ttf', '.eot', '.png', '.jpg', '.jpeg', '.ico', '.gif',
  '.xlsx', '.zip', '.pdf',
]);

/** Real first/last names that must never appear outside the allowlist below. */
const BANNED_NAMES = ['Kristin', 'Tine', 'Sanaz', 'Safaa', 'Süheyl', 'Sönmezoglu', 'Al Helal'];

/** file (repo-relative, forward slashes) → banned names permitted in it. */
const ALLOWLIST: Record<string, string[]> = {
  'src/adapters/excel/values.ts': ['Tine', 'Kristin', 'Sanaz'],
  'src/domain/__tests__/excel.test.ts': ['Tine', 'Kristin', 'Sanaz'],
  // this file has to name the banned words and the allowlist itself
  'src/domain/__tests__/no-real-names.test.ts': BANNED_NAMES,
};

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (EXCLUDE_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (!BINARY_EXTENSIONS.has(entry.slice(entry.lastIndexOf('.')))) out.push(full);
  }
  return out;
}

function nameRegex(name: string): RegExp {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // \b word boundaries so short names (e.g. "Tine") don't match inside an
  // unrelated word (e.g. "routinely").
  return new RegExp(`\\b${escaped}\\b`, 'i');
}

describe('no real person names anywhere in the repo (except the documented legacy literal)', () => {
  it('scans every text file for the banned name list', () => {
    const offenders: string[] = [];
    for (const file of walk(ROOT)) {
      const rel = relative(ROOT, file).replace(/\\/g, '/');
      const text = readFileSync(file, 'utf8');
      for (const name of BANNED_NAMES) {
        if (!nameRegex(name).test(text)) continue;
        const allowed = ALLOWLIST[rel]?.includes(name);
        if (!allowed) offenders.push(`${rel}: "${name}"`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
