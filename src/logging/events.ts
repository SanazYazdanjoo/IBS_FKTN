/**
 * Event type and screen dictionaries — the single source of truth for the
 * numeric vocabulary of the event log. Ids are append-only: never renumber
 * or reuse an id once shipped, or historic logs become misdecoded.
 *
 * Pure, dependency-free (no DOM, no React) so it can be imported both from
 * the app bundle and from plain Node CLI scripts (scripts/log-*.ts run via
 * `node --experimental-strip-types`, which requires relative imports to
 * carry an explicit extension — see tsconfig `allowImportingTsExtensions`).
 */

// ── Event types (ty) ────────────────────────────────────────────────────
export const EventType = {
  // Lifecycle & navigation (0–19)
  SESSION_START: 0,
  SESSION_END: 1,
  ROUTE_ENTER: 2,
  ROUTE_LEAVE: 3,
  VISIBILITY_CHANGE: 4,
  FOCUS: 5,
  BLUR: 6,
  ONLINE: 7,
  OFFLINE: 8,
  RELOAD: 9,
  IDLE_GAP: 10,
  CLOCK_SKEW: 11,

  // Interaction (20–39)
  CLICK: 20,
  KEY_SUBMIT: 21,
  SCROLL_DEPTH: 22,
  NAV_BACK_FORWARD: 23,

  // Forms (40–69)
  FIELD_FOCUS: 40,
  FIELD_BLUR: 41,
  FIELD_FIRST_CHANGE: 42,
  FIELD_CHANGE_SUMMARY: 43,
  FIELD_VALIDATION_FAIL: 44,
  FIELD_CORRECTION_AFTER_ERROR: 45,
  FIELD_ABANDONED: 46,
  FORM_SUBMIT_ATTEMPT: 47,
  FORM_SUBMIT_SUCCESS: 48,
  FORM_SUBMIT_FAILURE: 49,

  // Uploads (70–79)
  UPLOAD_START: 70,
  UPLOAD_OUTCOME: 71,

  // Domain (80–109)
  STATUS_TRANSITION: 80,
  CALCULATION_RUN: 81,
  AMOUNT_MISMATCH: 82,
  EXCEPTION_APPLIED: 83,
  SIGNATURE_MODE_USED: 84,
  DEPUTY_ACTIVATED: 85,

  // Admin / Manager (110–129)
  QUEUE_OPENED: 110,
  REVIEW_DURATION: 111,
  APPROVE: 112,
  BULK_APPROVE: 113,
  CORRECTION_REQUESTED: 114,
  EXPORT_GENERATED: 115,

  // Data source (130–149)
  ADAPTER_SELECTED: 130,
  WORKBOOK_VALIDATION: 131,
  SCHEMA_RESOLUTION: 132,
  CROSS_CHECK_DIVERGENCE: 133,
  WRITE_OUTCOME: 134,

  // Errors (150–159)
  EXCEPTION_CAUGHT: 150,
  UNHANDLED_REJECTION: 151,
  ERROR_BOUNDARY_TRIP: 152,

  // Performance (160–169)
  ROUTE_RENDER_TIME: 160,
  LONG_TASK: 161,
  TIME_TO_INTERACTIVE: 162,
  ADAPTER_IO_DURATION: 163,

  // Meta — the log describing its own losses (170–179)
  BUFFER_DROP: 170,
  FLUSH: 171,
  SAMPLING_DECISION: 172,
  LOG_FILE_ROTATED: 173,

  // Consent / log lifecycle (180–189)
  CONSENT_GRANTED: 180,
  CONSENT_REVOKED: 181,
  LOG_EXPORTED: 182,
  LOG_DELETED: 183,
} as const;

export type EventTypeId = (typeof EventType)[keyof typeof EventType];

/** Human-readable dictionary shipped alongside the log so numbers stay decodable years later. */
export const EVENT_TYPE_DICT: Record<number, { name: string; desc: string }> = {
  [EventType.SESSION_START]: { name: 'SESSION_START', desc: 'App/session started' },
  [EventType.SESSION_END]: { name: 'SESSION_END', desc: 'Session ended (unload or explicit)' },
  [EventType.ROUTE_ENTER]: { name: 'ROUTE_ENTER', desc: 'Navigated into a screen' },
  [EventType.ROUTE_LEAVE]: { name: 'ROUTE_LEAVE', desc: 'Left a screen; a.dw = dwell bucket (ms)' },
  [EventType.VISIBILITY_CHANGE]: { name: 'VISIBILITY_CHANGE', desc: 'Tab hidden/visible; a.v = 1 visible / 0 hidden' },
  [EventType.FOCUS]: { name: 'FOCUS', desc: 'Window gained focus' },
  [EventType.BLUR]: { name: 'BLUR', desc: 'Window lost focus' },
  [EventType.ONLINE]: { name: 'ONLINE', desc: 'Browser went online' },
  [EventType.OFFLINE]: { name: 'OFFLINE', desc: 'Browser went offline' },
  [EventType.RELOAD]: { name: 'RELOAD', desc: 'Page reload detected' },
  [EventType.IDLE_GAP]: { name: 'IDLE_GAP', desc: 'No interaction for longer than the idle threshold; a.g = gap bucket (ms)' },
  [EventType.CLOCK_SKEW]: { name: 'CLOCK_SKEW', desc: 'performance.now() and Date.now() drifted; a.d = drift bucket (ms)' },

  [EventType.CLICK]: { name: 'CLICK', desc: 'Click on an element with data-log-id; a.id = element id' },
  [EventType.KEY_SUBMIT]: { name: 'KEY_SUBMIT', desc: 'Form submitted via keyboard (Enter)' },
  [EventType.SCROLL_DEPTH]: { name: 'SCROLL_DEPTH', desc: 'Coalesced scroll-depth summary; a.pct = max % reached' },
  [EventType.NAV_BACK_FORWARD]: { name: 'NAV_BACK_FORWARD', desc: 'Browser back/forward navigation' },

  [EventType.FIELD_FOCUS]: { name: 'FIELD_FOCUS', desc: 'Field gained focus; a.f = field id' },
  [EventType.FIELD_BLUR]: { name: 'FIELD_BLUR', desc: 'Field lost focus; a.f = field id, a.dw = dwell bucket' },
  [EventType.FIELD_FIRST_CHANGE]: { name: 'FIELD_FIRST_CHANGE', desc: 'First edit of a field; a.f = field id, a.ttfi = time-to-first-input bucket' },
  [EventType.FIELD_CHANGE_SUMMARY]: { name: 'FIELD_CHANGE_SUMMARY', desc: 'Coalesced change count for a field; a.f = field id, a.n = change count bucket' },
  [EventType.FIELD_VALIDATION_FAIL]: { name: 'FIELD_VALIDATION_FAIL', desc: 'Validation failed; a.f = field id, a.ec = error code' },
  [EventType.FIELD_CORRECTION_AFTER_ERROR]: { name: 'FIELD_CORRECTION_AFTER_ERROR', desc: 'Field edited again after a validation failure; a.f = field id' },
  [EventType.FIELD_ABANDONED]: { name: 'FIELD_ABANDONED', desc: 'Field focused, never filled; a.f = field id' },
  [EventType.FORM_SUBMIT_ATTEMPT]: { name: 'FORM_SUBMIT_ATTEMPT', desc: 'Form submit attempted; a.form = form id' },
  [EventType.FORM_SUBMIT_SUCCESS]: { name: 'FORM_SUBMIT_SUCCESS', desc: 'Form submit succeeded; a.form = form id' },
  [EventType.FORM_SUBMIT_FAILURE]: { name: 'FORM_SUBMIT_FAILURE', desc: 'Form submit failed; a.form = form id, a.ec = error code' },

  [EventType.UPLOAD_START]: { name: 'UPLOAD_START', desc: 'Upload started; a.kind = ProofKind, a.mime, a.sz = size bucket' },
  [EventType.UPLOAD_OUTCOME]: { name: 'UPLOAD_OUTCOME', desc: 'Upload finished; a.ok, a.dur = duration bucket, a.reason on failure' },

  [EventType.STATUS_TRANSITION]: { name: 'STATUS_TRANSITION', desc: 'ProcessStatus changed; a.from, a.to, a.pid = pseudonymous participant id' },
  [EventType.CALCULATION_RUN]: { name: 'CALCULATION_RUN', desc: 'Reimbursement engine ran; a.rv = rule version, a.pid' },
  [EventType.AMOUNT_MISMATCH]: { name: 'AMOUNT_MISMATCH', desc: 'Engine result vs. Excel amountOverride differ; a.mag = magnitude bucket, a.pid' },
  [EventType.EXCEPTION_APPLIED]: { name: 'EXCEPTION_APPLIED', desc: 'ExceptionCategory applied (3-km, VMT, PKW, …); a.cat, a.pid' },
  [EventType.SIGNATURE_MODE_USED]: { name: 'SIGNATURE_MODE_USED', desc: 'SignatureMode used; a.mode, a.pid' },
  [EventType.DEPUTY_ACTIVATED]: { name: 'DEPUTY_ACTIVATED', desc: 'Vertretung/deputy activation' },

  [EventType.QUEUE_OPENED]: { name: 'QUEUE_OPENED', desc: 'Manager/Admin queue opened; a.n = item count' },
  [EventType.REVIEW_DURATION]: { name: 'REVIEW_DURATION', desc: 'Time spent reviewing one item; a.dur = duration bucket, a.pid' },
  [EventType.APPROVE]: { name: 'APPROVE', desc: 'Single item approved; a.pid' },
  [EventType.BULK_APPROVE]: { name: 'BULK_APPROVE', desc: 'Bulk approve; a.n = item count, a.fail = failure count' },
  [EventType.CORRECTION_REQUESTED]: { name: 'CORRECTION_REQUESTED', desc: 'Correction requested; a.cat = ExceptionCategory-derived reason code, a.pid' },
  [EventType.EXPORT_GENERATED]: { name: 'EXPORT_GENERATED', desc: 'An export/Formular was generated' },

  [EventType.ADAPTER_SELECTED]: { name: 'ADAPTER_SELECTED', desc: 'Storage adapter chosen; a.kind = MOCK/EXCEL, a.mode = FILE/FOLDER' },
  [EventType.WORKBOOK_VALIDATION]: { name: 'WORKBOOK_VALIDATION', desc: 'Excel structure check ran; a.ok, a.rows, a.unknownCols' },
  [EventType.SCHEMA_RESOLUTION]: { name: 'SCHEMA_RESOLUTION', desc: 'Column schema resolved; a.unknownCols, a.rowIssues' },
  [EventType.CROSS_CHECK_DIVERGENCE]: { name: 'CROSS_CHECK_DIVERGENCE', desc: 'Attendance cross-check disagreed; a.n = divergence count' },
  [EventType.WRITE_OUTCOME]: { name: 'WRITE_OUTCOME', desc: 'Adapter write finished; a.ok, a.dur = duration bucket' },

  [EventType.EXCEPTION_CAUGHT]: { name: 'EXCEPTION_CAUGHT', desc: 'Caught exception; a.ec = error code, a.comp = component, a.sh = stack hash' },
  [EventType.UNHANDLED_REJECTION]: { name: 'UNHANDLED_REJECTION', desc: 'Unhandled promise rejection; a.sh = stack hash' },
  [EventType.ERROR_BOUNDARY_TRIP]: { name: 'ERROR_BOUNDARY_TRIP', desc: 'React error boundary caught a render error; a.sh = stack hash' },

  [EventType.ROUTE_RENDER_TIME]: { name: 'ROUTE_RENDER_TIME', desc: 'Screen render time bucket; a.dur' },
  [EventType.LONG_TASK]: { name: 'LONG_TASK', desc: 'Long task observed; a.dur = duration bucket' },
  [EventType.TIME_TO_INTERACTIVE]: { name: 'TIME_TO_INTERACTIVE', desc: 'Time to interactive for a screen; a.dur' },
  [EventType.ADAPTER_IO_DURATION]: { name: 'ADAPTER_IO_DURATION', desc: 'Adapter read/write duration; a.op, a.dur' },

  [EventType.BUFFER_DROP]: { name: 'BUFFER_DROP', desc: 'Ring buffer overflowed; a.n = events dropped since last report' },
  [EventType.FLUSH]: { name: 'FLUSH', desc: 'Buffer flushed to sink; a.n = event count, a.dur = flush duration bucket' },
  [EventType.SAMPLING_DECISION]: { name: 'SAMPLING_DECISION', desc: 'Sampling rate applied to an event class; a.ty, a.rate (per mille)' },
  [EventType.LOG_FILE_ROTATED]: { name: 'LOG_FILE_ROTATED', desc: 'Log file rotated; a.sz = size bucket of the rotated-out file' },

  [EventType.CONSENT_GRANTED]: { name: 'CONSENT_GRANTED', desc: 'User opted in to logging' },
  [EventType.CONSENT_REVOKED]: { name: 'CONSENT_REVOKED', desc: 'User opted out; existing data deleted' },
  [EventType.LOG_EXPORTED]: { name: 'LOG_EXPORTED', desc: 'User exported their own log' },
  [EventType.LOG_DELETED]: { name: 'LOG_DELETED', desc: 'User deleted their own log' },
};

// ── Screens (sc) ─────────────────────────────────────────────────────────
export const Screen = {
  UNKNOWN: 0,
  TN_FLOW: 1,
  TN_CORRECTION: 2,
  ADMIN_UEBERSICHT: 3,
  ADMIN_YEAR_OVERVIEW: 4,
  ADMIN_YEAR_CALENDAR: 5,
  ADMIN_REMINDER: 6,
  ADMIN_VERGLEICHSRECHNUNG: 7,
  DOCS_DOCUMENTATION: 8,
  ADMIN_TN_DATA: 9,
  ADMIN_AUDIT_LOG: 10,
  ADMIN_TN_DETAIL: 11,
  ADMIN_FORMULAR: 12,
  DOZENT_ATTENDANCE: 13,
  MANAGER_QUEUE: 14,
  SETTINGS_SIGNATURE: 15,
  SETTINGS_DATA_SOURCE: 16,
  SETTINGS_LOGGING: 17,
} as const;

export type ScreenId = (typeof Screen)[keyof typeof Screen];

export const SCREEN_DICT: Record<number, { name: string; path: string }> = {
  [Screen.UNKNOWN]: { name: 'UNKNOWN', path: '' },
  [Screen.TN_FLOW]: { name: 'TN_FLOW', path: '/tn' },
  [Screen.TN_CORRECTION]: { name: 'TN_CORRECTION', path: '/tn/correction' },
  [Screen.ADMIN_UEBERSICHT]: { name: 'ADMIN_UEBERSICHT', path: '/admin' },
  [Screen.ADMIN_YEAR_OVERVIEW]: { name: 'ADMIN_YEAR_OVERVIEW', path: '/admin/jahr' },
  [Screen.ADMIN_YEAR_CALENDAR]: { name: 'ADMIN_YEAR_CALENDAR', path: '/admin/kalender' },
  [Screen.ADMIN_REMINDER]: { name: 'ADMIN_REMINDER', path: '/reminder' },
  [Screen.ADMIN_VERGLEICHSRECHNUNG]: { name: 'ADMIN_VERGLEICHSRECHNUNG', path: '/vergleichsrechnung' },
  [Screen.DOCS_DOCUMENTATION]: { name: 'DOCS_DOCUMENTATION', path: '/dokumentation' },
  [Screen.ADMIN_TN_DATA]: { name: 'ADMIN_TN_DATA', path: '/admin/daten' },
  [Screen.ADMIN_AUDIT_LOG]: { name: 'ADMIN_AUDIT_LOG', path: '/admin/protokoll' },
  [Screen.ADMIN_TN_DETAIL]: { name: 'ADMIN_TN_DETAIL', path: '/admin/tn/:id' },
  [Screen.ADMIN_FORMULAR]: { name: 'ADMIN_FORMULAR', path: '/admin/tn/:id/formular' },
  [Screen.DOZENT_ATTENDANCE]: { name: 'DOZENT_ATTENDANCE', path: '/dozent' },
  [Screen.MANAGER_QUEUE]: { name: 'MANAGER_QUEUE', path: '/manager' },
  [Screen.SETTINGS_SIGNATURE]: { name: 'SETTINGS_SIGNATURE', path: '/settings' },
  [Screen.SETTINGS_DATA_SOURCE]: { name: 'SETTINGS_DATA_SOURCE', path: '/settings/data' },
  [Screen.SETTINGS_LOGGING]: { name: 'SETTINGS_LOGGING', path: '/settings/logging' },
};

/** Maps a HashRouter pathname to its screen id. Longest-prefix match so nested/dynamic routes resolve. */
export function screenForPath(pathname: string): ScreenId {
  const path = pathname.replace(/\/$/, '') || '/';
  if (/^\/admin\/tn\/[^/]+\/formular$/.test(path)) return Screen.ADMIN_FORMULAR;
  if (/^\/admin\/tn\/[^/]+$/.test(path)) return Screen.ADMIN_TN_DETAIL;
  const direct = Object.entries(SCREEN_DICT).find(([, v]) => v.path === path);
  if (direct) return Number(direct[0]) as ScreenId;
  if (path === '/admin/pipeline') return Screen.ADMIN_UEBERSICHT;
  return Screen.UNKNOWN;
}

// ── Payload key allowlist ────────────────────────────────────────────────
/**
 * Every key any event payload is allowed to carry. redact.ts drops anything
 * not listed here — this is the enforcement point for "no personal data,
 * ever": a field simply cannot reach a sink unless its identifier is named
 * below, and identifiers only ever carry shapes/enums/buckets, never values.
 */
export const PAYLOAD_KEY_ALLOWLIST: ReadonlySet<string> = new Set([
  'dw', 'v', 'g', 'd', 'id', 'pct', 'f', 'ttfi', 'n', 'ec', 'form',
  'kind', 'mime', 'sz', 'ok', 'dur', 'reason', 'from', 'to', 'pid', 'rv',
  'mag', 'cat', 'mode', 'unknownCols', 'rows', 'rowIssues', 'fail', 'op',
  'ty', 'rate', 'comp', 'sh', 'layout',
]);

/** Buckets a byte/duration/amount magnitude into a small closed set of labels — never the exact number. */
export function bucket(value: number, edges: readonly number[]): number {
  let i = 0;
  while (i < edges.length && value > edges[i]) i += 1;
  return i;
}

export const DURATION_BUCKETS_MS = [1000, 5000, 15000, 60000, 300000, 900000] as const;
export const SIZE_BUCKETS_BYTES = [10_000, 100_000, 1_000_000, 5_000_000] as const;
export const AMOUNT_BUCKETS_CENTS = [10, 100, 500, 2000] as const;
export const CHANGE_COUNT_BUCKETS = [1, 3, 10, 30] as const;
