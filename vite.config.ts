import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { execSync } from 'node:child_process';

/** Short commit sha for the review-build version banner; 'unknown' outside a git checkout (e.g. an unpacked review zip). */
function gitSha(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'unknown';
  }
}

const isReviewBuild = process.env.VITE_REVIEW_BUILD === '1';

export default defineConfig({
  // Review build only: browsers refuse to load <script type="module"> and
  // <link rel="stylesheet"> over file:// (CORS treats every file:// origin
  // as "null") — so a reviewer double-clicking index.html gets a blank
  // page. Inlining everything into one HTML file sidesteps that entirely;
  // a normal `npm run build` is unaffected (still a real multi-file,
  // cacheable, server-hosted build).
  plugins: [react(), ...(isReviewBuild ? [viteSingleFile()] : [])],
  // Configurable so the review build can use a relative base ('./') and run
  // from a plain file path or any static host subdirectory — HashRouter
  // handles the routing, base only affects where assets are looked up.
  base: process.env.VITE_BASE_PATH ?? '/',
  define: {
    __GIT_SHA__: JSON.stringify(gitSha()),
  },
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
  },
} as any);
