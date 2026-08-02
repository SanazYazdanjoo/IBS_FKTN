#!/usr/bin/env node
/**
 * One-command review build (Part 4): type-checks, builds with
 * VITE_REVIEW_BUILD=1 and a relative Vite `base` (so the result opens from
 * a plain file path or any static host — HashRouter handles the routing),
 * then zips the output so a non-technical reviewer can unpack and open it.
 *
 * Usage: npm run build:review
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const require = createRequire(import.meta.url);
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT_DIR = join(ROOT, 'dist-review');
const DATE_STAMP = new Date().toISOString().slice(0, 10);
const ZIP_NAME = `ibs-fahrtkostenerstattung-review-${DATE_STAMP}.zip`;
const ZIP_PATH = join(ROOT, ZIP_NAME);
const ARCHIVE_ROOT_FOLDER = 'ibs-fahrtkostenerstattung-review';

function step(label) {
  console.log(`\n— ${label} —`);
}

step('1/3 Type-checking (tsc -b)');
execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-b'], {
  cwd: ROOT,
  stdio: 'inherit',
});

step('2/3 Building (VITE_REVIEW_BUILD=1, relative base)');
rmSync(OUT_DIR, { recursive: true, force: true });
const viteBin = join(require.resolve('vite/package.json'), '..', 'bin', 'vite.js');
execFileSync(
  process.execPath,
  [viteBin, 'build', '--outDir', OUT_DIR, '--emptyOutDir'],
  {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, VITE_REVIEW_BUILD: '1', VITE_BASE_PATH: './' },
  },
);

step('3/3 Zipping');
rmSync(ZIP_PATH, { force: true });

function addDir(dir, zipFolder) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      addDir(full, zipFolder.folder(entry));
    } else {
      zipFolder.file(entry, readFileSync(full));
    }
  }
}

const zip = new JSZip();
addDir(OUT_DIR, zip.folder(ARCHIVE_ROOT_FOLDER));
const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
writeFileSync(ZIP_PATH, buffer);

console.log(`\nDone: ${relative(ROOT, ZIP_PATH)}`);
console.log(
  `Hand this zip to a reviewer: unpack anywhere, open ` +
    `${ARCHIVE_ROOT_FOLDER}/index.html directly in a browser — no server, no install.`,
);
