/**
 * Review-build gate (VITE_REVIEW_BUILD=1).
 *
 * A single flag that the review build sets and a normal dev/prod build never
 * does. Everything that must not reach three outside reviewers hangs off
 * this constant: real file/folder loading, the Google Sheets source, and any
 * write path that could touch a real workbook. See docs/DECISIONS.md.
 */
import { version as appVersion } from '../../package.json';

export const REVIEW_BUILD = import.meta.env.VITE_REVIEW_BUILD === '1';

/** Local-experiment opt-in for the read-only Google Sheets attendance source.
 *  Off by default; forced off in the review build regardless of this flag —
 *  never point it at a real cohort spreadsheet. */
export const SHEETS_SOURCE_ENABLED =
  !REVIEW_BUILD && import.meta.env.VITE_ENABLE_SHEETS_SOURCE === '1';

export const APP_VERSION = appVersion;
export const GIT_SHA = __GIT_SHA__;
