# Event log — documentation

This document describes the pseudonymous, local-only event log implemented
in `src/logging/`. It is written to be handed to the institute's
Datenschutzbeauftragte(r) as-is: what is recorded, why, for how long, and
what guarantees the redaction step provides. It is **not** the same system
as the human-readable change log at `/admin/protokoll`
(`src/app/auditLog.ts`) — that log intentionally records actor names and
free-text messages for compliance traceability of *who changed what*. This
log exists for a different purpose (measuring the process, not attributing
individual actions) and is held to a stricter, pseudonymous-only standard.

## Purpose

To let the research team (Phase 4 evaluation) measure how the digitised
Fahrtkostenerstattung process actually behaves — cycle times, correction
loops, drop-off points, pipeline stage durations, calculation-vs-Excel
disagreement rates, error rates, usability metrics — without recording who
did what.

## Legal basis

Processing is based on consent (Art. 6(1)(a) DSGVO), captured explicitly
before any data is recorded (except in demo/seed mode, where no real
participant data exists). Consent can be withdrawn at any time from
Einstellungen → Datenschutz & Protokoll, which also deletes all data already
collected for that installation.

## What is never recorded

No names, addresses, IBANs, email addresses, uploaded file names, free-text
notes, or the *value* of any form field. This is enforced structurally, not
by convention:

- `src/logging/redact.ts` only keeps a payload key if it appears in the
  fixed allowlist in `src/logging/events.ts` (`PAYLOAD_KEY_ALLOWLIST`) — an
  unlisted key is dropped, full stop.
- Even an allowed key's value must match a short "safe token" shape
  (letters/digits/`_-./`, ≤32 characters) or it is dropped too — free text
  (a name, an address, a sentence) fails this check by construction, not by
  matching specific PII patterns after the fact. An IBAN-shaped value is
  rejected explicitly as well, since it would otherwise pass the token-shape
  check.
- Actor ids and any participant id referenced from a domain event (`aid`,
  `pid`) are SHA-256 hashes salted with a random value generated once per
  browser installation (`src/logging/salt.ts`), stored only in that
  browser's `localStorage`. The salt is never committed, never
  synchronised, and never leaves the browser.
- `redact.test.ts` asserts that a payload containing an IBAN, an email
  address, and a name — nested and inside arrays — never survives.

## Where the data lives

Entirely local to the browser/installation — no network transmission of any
kind (NFR-01). Default sink: IndexedDB (`IndexedDbSink`, survives a reload).
Alternatives: `FileDownloadSink` (manual "Log exportieren" download),
`FolderSink` (writes into a folder the user picks via the File System
Access API — the same mechanism `src/adapters/excel/folderSource.ts` already
uses for the workbook; not wired to `daten/` by default, since adding a new
folder there is an ORDNERSTRUKTUR.md decision, not this subsystem's to make).

## Retention

90 days (`RETENTION_DAYS` in `src/logging/consent.ts`). Expired sessions are
pruned automatically the next time the app opens (`IndexedDbSink.pruneExpired`).
A total size budget (20 MB across all sessions, `TOTAL_BUDGET_BYTES` in
`src/logging/sinks/IndexedDbSink.ts`) is enforced on every write, evicting the
oldest session first.

## Consent & defaults

- Production-like use (`env: 'EXCEL'`): off until the user explicitly opts
  in via the consent gate.
- Demo/seed mode (`env: 'MOCK'`): on by default, since there is no real
  participant data to protect and the research team needs the prototype's
  own usage data.
- Revoking consent stops collection **and** deletes everything already
  stored for that installation (`IndexedDbSink.clearAll`).
- "Log exportieren" and "Log löschen" in Einstellungen let a participant
  export or wipe their own installation's data at any time.

## Envelope & session header

Every log file starts with one session header line, then one line per
event (NDJSON). See `src/logging/schema.ts` for the authoritative shapes;
summary:

**Session header** (once per file): schema version, session id, absolute
start time + timezone, role, salted actor id, app version, data-source kind,
coarse user-agent/viewport/language/connection type.

**Envelope** (per event): `t` (ms since session start), `ty` (numeric event
type, see below), `sq` (gapless monotonic sequence number), `sc` (numeric
screen id), and an optional `a` payload object whose fields are documented
per event type below. Empty/false/zero fields are omitted entirely.

## Screens (`sc`)

`UNKNOWN`, `TN_FLOW`, `TN_CORRECTION`, `ADMIN_UEBERSICHT`,
`ADMIN_YEAR_OVERVIEW`, `ADMIN_YEAR_CALENDAR`, `ADMIN_REMINDER`,
`ADMIN_VERGLEICHSRECHNUNG`, `DOCS_DOCUMENTATION`, `ADMIN_TN_DATA`,
`ADMIN_AUDIT_LOG`, `ADMIN_TN_DETAIL`, `ADMIN_FORMULAR`,
`DOZENT_ATTENDANCE`, `MANAGER_QUEUE`, `SETTINGS_SIGNATURE`,
`SETTINGS_DATA_SOURCE`, `SETTINGS_LOGGING` — numeric ids and route mapping
in `src/logging/events.ts` (`Screen`, `SCREEN_DICT`).

## Event types (`ty`)

Numeric ids are append-only — a type is never renumbered or reused. The
canonical numeric mapping and this same text live together in
`EVENT_TYPE_DICT` (`src/logging/events.ts`); a build-time test
(`docs-coverage.test.ts`) fails if a new event type is added there without a
matching entry here.

### Lifecycle & navigation

- **SESSION_START** — app/session started.
- **SESSION_END** — session ended (unload or explicit).
- **ROUTE_ENTER** — navigated into a screen.
- **ROUTE_LEAVE** — left a screen. `dw` = dwell time bucket (ms).
- **VISIBILITY_CHANGE** — tab hidden/visible. `v` = 1 visible / 0 hidden.
- **FOCUS** / **BLUR** — window gained/lost focus.
- **ONLINE** / **OFFLINE** — browser connectivity changed.
- **RELOAD** — page reload detected.
- **IDLE_GAP** — no interaction for longer than the idle threshold. `g` = gap bucket (ms).
- **CLOCK_SKEW** — `performance.now()` and `Date.now()` drifted (sleeping laptop, long session). `d` = drift bucket (ms).

### Interaction

- **CLICK** — click on an element carrying `data-log-id`. `id` = that element's id (never its text content).
- **KEY_SUBMIT** — form submitted via Enter.
- **SCROLL_DEPTH** — coalesced scroll-depth summary. `pct` = max % reached.
- **NAV_BACK_FORWARD** — browser back/forward navigation.

### Forms

- **FIELD_FOCUS** — field gained focus. `f` = field id.
- **FIELD_BLUR** — field lost focus. `f`, `dw` = dwell bucket.
- **FIELD_FIRST_CHANGE** — first edit of a field. `f`, `ttfi` = time-to-first-input bucket.
- **FIELD_CHANGE_SUMMARY** — coalesced change count for a field (never one event per keystroke). `f`, `n` = change-count bucket.
- **FIELD_VALIDATION_FAIL** — validation failed. `f`, `ec` = error code.
- **FIELD_CORRECTION_AFTER_ERROR** — field edited again after a validation failure. `f`.
- **FIELD_ABANDONED** — field focused, never filled. `f`.
- **FORM_SUBMIT_ATTEMPT** / **FORM_SUBMIT_SUCCESS** / **FORM_SUBMIT_FAILURE** — `form` = form id, `ec` = error code on failure.

### Uploads

- **UPLOAD_START** — `kind` = ProofKind, `mime`, `sz` = size bucket. Never the file name.
- **UPLOAD_OUTCOME** — `ok`, `dur` = duration bucket, `reason` on failure.

### Domain

- **STATUS_TRANSITION** — ProcessStatus changed. `from`, `to`, `pid` = salted participant id.
- **CALCULATION_RUN** — reimbursement engine ran. `rv` = rule version, `pid`.
- **AMOUNT_MISMATCH** — engine result vs. the recorded Excel amount differ. `mag` = magnitude bucket, `pid`.
- **EXCEPTION_APPLIED** — an ExceptionCategory was applied (3-km rule, VMT comparison, PKW, …). `cat`, `pid`.
- **SIGNATURE_MODE_USED** — `mode` (PAPER/DIGITAL), `pid`.
- **DEPUTY_ACTIVATED** — Vertretung/deputy activation.

### Admin / Manager

- **QUEUE_OPENED** — `n` = item count.
- **REVIEW_DURATION** — time spent reviewing one item. `dur`, `pid`.
- **APPROVE** — single item approved. `pid`.
- **BULK_APPROVE** — `n` = item count, `fail` = failure count.
- **CORRECTION_REQUESTED** — `cat` = reason category, `pid`.
- **EXPORT_GENERATED** — an export/Formular was generated.

### Data source

- **ADAPTER_SELECTED** — `kind` (MOCK/EXCEL), `mode` (FILE/FOLDER) when known.
- **WORKBOOK_VALIDATION** — `ok`, `rows`, `unknownCols`.
- **SCHEMA_RESOLUTION** — `unknownCols`, `rowIssues`.
- **CROSS_CHECK_DIVERGENCE** — `n` = divergence count.
- **WRITE_OUTCOME** — `ok`, `dur` = duration bucket.

### Errors

- **EXCEPTION_CAUGHT** — `ec` = error code, `comp` = component, `sh` = stack hash (never the stack text).
- **UNHANDLED_REJECTION** — `sh` = stack hash.
- **ERROR_BOUNDARY_TRIP** — React error boundary caught a render error. `sh`.

### Performance

- **ROUTE_RENDER_TIME** — `dur` = render-time bucket.
- **LONG_TASK** — `dur` = duration bucket.
- **TIME_TO_INTERACTIVE** — `dur`.
- **ADAPTER_IO_DURATION** — `op`, `dur`.

### Meta — the log describing its own losses

- **BUFFER_DROP** — ring buffer overflowed. `n` = events dropped since the last report.
- **FLUSH** — buffer flushed to the sink. `n`, `dur` = flush-duration bucket.
- **SAMPLING_DECISION** — a sampling rate was applied to an event class. `ty` (the sampled type), `rate` (per mille).
- **LOG_FILE_ROTATED** — `sz` = size bucket of the rotated-out file.

### Consent / log lifecycle

- **CONSENT_GRANTED** — user opted in.
- **CONSENT_REVOKED** — user opted out; existing data deleted.
- **LOG_EXPORTED** — user exported their own log.
- **LOG_DELETED** — user deleted their own log.

## Sampling

High-volume event classes may be sampled below 1.0; the configured rate for
each sampled type is recorded once per session via a `SAMPLING_DECISION`
event at session start, so any downstream analysis can correct for it.

## Tooling

- `npm run log:decode -- <file>` — NDJSON + dictionary → readable table.
- `npm run log:report -- <file>` — the metrics listed under "Goal" in the
  originating task brief (cycle times, correction loops, funnels, time on
  task, error rates), computed by the pure functions in
  `src/logging/analysis/`.
- Dev panel (flag-gated) — live events, buffer fill, drop count, current
  file size.
