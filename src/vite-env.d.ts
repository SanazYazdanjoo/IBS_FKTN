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
  readonly [key: string]: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
