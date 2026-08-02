/**
 * Typen für import.meta.env. Die tsconfig schränkt `types` auf
 * ["vitest/globals"] ein, deshalb wird "vite/client" nicht automatisch
 * geladen und ImportMeta muss hier lokal deklariert werden.
 */
interface ImportMetaEnv {
  readonly VITE_SHEETS_ID?: string;
  readonly VITE_SHEETS_API_KEY?: string;
  readonly VITE_SHEETS_DAILY_TAB?: string;
  readonly VITE_SHEETS_OVERALL_TAB?: string;
  /** Local-experiment opt-in for the Google Sheets source; forced off in the review build regardless. */
  readonly VITE_ENABLE_SHEETS_SOURCE?: string;
  /** '1' = review build: mock-only, no real-file I/O, persistent demo banner. See src/app/reviewBuild.ts. */
  readonly VITE_REVIEW_BUILD?: string;
  readonly VITE_BASE_PATH?: string;
  readonly [key: string]: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Injected at build time via vite.config.ts `define` (short git sha, or 'unknown'). */
declare const __GIT_SHA__: string;
