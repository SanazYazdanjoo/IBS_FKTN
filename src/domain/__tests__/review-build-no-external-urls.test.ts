/**
 * Guards Part 1 points 1, 2 and 4: builds the actual review build
 * (VITE_REVIEW_BUILD=1) and scans every emitted file for http(s):// URLs.
 * Anything pointing at a host outside the allowlist fails the test — this is
 * what keeps the Google Fonts CDN import or the Google Sheets source from
 * silently regressing back into a live network dependency.
 *
 * The allowlist is by hostname, not by file: bundled third-party libraries
 * (exceljs, react, react-router, jszip, elliptic) carry inert URL strings —
 * XML namespace URIs, doc/error-message links, leftover package.json
 * metadata — that are never fetched at runtime. Each entry says why.
 */
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const VITE_BIN = join(require.resolve('vite/package.json'), '..', 'bin', 'vite.js');

const BINARY_EXTENSIONS = new Set(['.woff2', '.woff', '.png', '.ico', '.jpg', '.jpeg']);

/** Hostnames allowed anywhere in the review build output, with why. */
const ALLOWED_HOSTS = new Set([
  // OOXML/Dublin Core XML namespace URIs baked into exceljs (.xlsx read/write) — never fetched.
  'schemas.microsoft.com',
  'schemas.openxmlformats.org',
  'purl.org',
  // SVG/XHTML/XML namespace URIs (react-dom + our own documentation.svg) — never fetched.
  'www.w3.org',
  // Informational error-message / upgrade-guide links embedded in react / react-router-dom,
  // shown only in console warnings, never fetched by the app.
  'reactjs.org',
  'reactrouter.com',
  // Leftover npm package.json / README metadata bundled into exceljs's crypto dependency chain.
  'github.com',
  'registry.npmjs.org',
  'stuk.github.io',
  // Gated, code-split, disabled-by-default local-experiment source (Part 1 point 1):
  // present only in its own lazy chunk (see DataSourceSettings.tsx), never fetched
  // unless a developer explicitly opts in outside the review build.
  'sheets.googleapis.com',
  // Vite's bundler (rolldown) embeds its own troubleshooting-doc link in a build
  // warning about exceljs's direct `eval` call — a comment in the tool, not a request.
  'rolldown.rs',
]);

function hostnamesIn(text: string): string[] {
  const hosts: string[] = [];
  const re = /https?:\/\/([a-zA-Z0-9.-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) hosts.push(m[1]);
  return hosts;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (!BINARY_EXTENSIONS.has(entry.slice(entry.lastIndexOf('.')))) out.push(full);
  }
  return out;
}

describe('review build: no external URLs outside the allowlist', () => {
  it('builds with VITE_REVIEW_BUILD=1 and scans the output', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'ibs-review-build-'));
    try {
      execFileSync(
        process.execPath,
        [VITE_BIN, 'build', '--outDir', outDir, '--emptyOutDir'],
        {
          cwd: process.cwd(),
          env: { ...process.env, VITE_REVIEW_BUILD: '1' },
          stdio: 'pipe',
        },
      );

      const offenders: string[] = [];
      for (const file of walk(outDir)) {
        const text = readFileSync(file, 'utf8');
        for (const host of hostnamesIn(text)) {
          if (!ALLOWED_HOSTS.has(host)) offenders.push(`${file.slice(outDir.length)}: ${host}`);
        }
      }
      expect(offenders).toEqual([]);

      // Fonts CDN specifically — the exact regression Part 1 point 2 fixed.
      const allText = walk(outDir).map((f) => readFileSync(f, 'utf8')).join('\n');
      expect(allText).not.toContain('fonts.googleapis.com');
      expect(allText).not.toContain('fonts.gstatic.com');
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  }, 60_000);
});
