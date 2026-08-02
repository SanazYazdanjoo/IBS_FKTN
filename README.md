# IBS Fahrtkostenerstattung — Prototype

Functional prototype for digitalizing the travel-cost reimbursement workflow
(LAT Sprint Qualifizierung). Built as part of an HCI research project:
Phase 1 (thematic analysis, personas, journeys, requirements) → Phase 2
(wireframes, Claude Design) → **Phase 3 (this repo)** → Phase 4 (evaluation
— see "Review build" below).

## Quick start

```bash
npm install
npm test        # 156 tests across 25 files — must stay green
npm run dev     # shell with role switcher at localhost:5173
```

Real, functional screens are wired up across five roles — TN, Dozent,
Manager, Admin, and Accounting (the last added for the review build, so an
Accountant reviewer has a real login and a real path to the Formular-check
task, not a borrowed Admin session). Two screens remain explicit
placeholders
(`src/features/docs/Placeholders.tsx`: Auto-Reminder Emails and the
Documentation viewer — each says so in the UI).
Everything else in `src/features/<role>/` is real and functional, not a
scaffold — see the route table in `src/app/App.tsx` for the full list.

## Architecture decisions (and why)

**1. Domain logic is pure and tested (`src/domain/`).**
Attendance rules, the reimbursement formula, the VMT Vergleichsrechnung,
the 3-km rule, submission completeness, and approval flags are pure
TypeScript functions with a Vitest suite. Every result carries a full
`trace`, so the TN screen, the Admin detail, and the Manager summary render
the *same* numbers from the *same* computation (NFR-03: no black-box
amounts — the root fix for Problem 3).

**2. The E/K rule question is settled, not open.**
`RuleConfig.sickDaysAreReimbursable` in `src/domain/rules.ts` encodes the
Anwesenheitsliste's own legend, which already states plainly that `E / K / X
/ (x)` count as present and `A / U` are deducted — so the legend reading is
the default (`true`), not a conservative fallback. A strict historical
reading (`false`, only `x`/`E`) stays available for older months where it
was applied differently; tests cover both paths. Presence-for-the-list and
reimbursable-for-the-money are deliberately separate concepts in
`attendance.ts`.

**3. Persistence and identity live behind adapters (`src/adapters/`).**
The app only ever talks to `StorageAdapter` / `AuthAdapter`. Three adapters
exist today: `MockAdapter` (in-memory demo data, always used in the review
build), an Excel adapter that reads/writes a real workbook — either a single
file or a `daten/` project folder with automatic timestamped backups before
every write (`src/adapters/excel/`) — and a **read-only** Google Sheets
attendance overlay (`src/adapters/attendance/googleSheetsSource.ts`), off by
default and force-disabled in the review build (see `docs/DECISIONS.md`: it
is a real external SaaS call and must never be pointed at a real cohort).
For production, IT would implement the same interfaces against the
IBS-owned cloud (e.g. Nextcloud WebDAV/OCS with existing LDAP accounts).
Participant data — bank statements, AUs, signatures — is designed to never
leave the institute (NFR-01/DSGVO).

**4. Data isolation is enforced in the adapter, not the UI.**
A TN actor's queries return only their own records; requesting anything
else throws `AccessDeniedError`. The role switcher in the app shell
demonstrates this live: each role has exactly one demo login (fictional
names — no real person appears anywhere in the repo, enforced by
`no-real-names.test.ts`), and switching roles changes what the application
state contains, not just what's rendered. Privacy by design, not by CSS.
Covered by `access-control.test.ts`.

**5. Rules are data, not scattered code.**
Prices, thresholds, the signature mode (Modus A Papier / Modus B digital,
FR-09), and the deputy-activation delay (P16) all live in `RuleConfig`. VMT
single fares are a maintained table (`src/domain/vmtFares.ts`, held at
runtime by `src/app/vmt-fares-context.tsx`), editable from
`/vergleichsrechnung`, replacing the manual per-case lookup (P15). See
`docs/DECISIONS.md` for why Modus B and the deputy automation aren't
switched on yet — both are implemented, neither is a technical gap.

## Review build (`VITE_REVIEW_BUILD=1`)

A separate, hardened build for handing the prototype to outside reviewers
(a Manager, a Dozent, an Accountant) — not a pilot: no real participant
data, no legal or financial weight.

```bash
npm run build:review   # type-check, build, zip — one command
```

What the flag changes (`src/app/reviewBuild.ts` and call sites):

- **Locked to demo data.** File/folder loading and the Google Sheets source
  are hidden and refuse to activate even if called directly — no reviewer
  can open or write a real workbook.
- **Persistent banner**: `Demofassung · Testdaten · kein Echtbetrieb`, plus
  the app version and git commit sha in the corner, so feedback can be tied
  to a specific build.
- **Guided tasks** (`src/features/review-tasks/`): a slim bar shows the
  current task, progress, and two actions (`Fertig` / `Ich komme nicht
  weiter`). Starting, completing, giving up, and — if a reload interrupts a
  task — abandoning are all logged with duration via the event log below.
  Tasks resume across a reload instead of restarting from scratch. One
  scripted task per reviewer role (Manager, Dozent, Accounting); after the
  last task, a short end-of-session questionnaire.
- **Structured feedback** (`src/features/feedback/`): a floating control on
  every screen, prefilled with screen/role/task/build context; a severity
  choice; free text (the one field never scrubbed — the UI warns not to
  type a participant's name, and every export is marked accordingly).
  Exportable as JSON and Markdown from `/review/log`; never transmitted
  anywhere.
- **Genuinely static and offline.** The review build inlines everything —
  JS, CSS, fonts — into a single `index.html` (`vite-plugin-singlefile`),
  because browsers refuse to load `<script type="module">` or an external
  stylesheet over `file://` (a real CORS restriction, not a theoretical
  one). A non-technical reviewer unzips the build and double-clicks
  `index.html`; no server, no install. Verified with the network fully
  disabled: no failed request, no degraded feature
  (`src/domain/__tests__/review-build-no-external-urls.test.ts` plus manual
  offline verification).

## Event log (usage analytics)

`src/logging/` records how the process is actually used — cycle times,
correction loops, drop-off points, pipeline-stage durations, calculation-vs-
Excel disagreement rates, error rates, and (review build only) guided-task
and feedback lifecycle events — as a local-only, pseudonymous NDJSON
stream. No names, addresses, IBANs, file names, or field values ever reach
it (enforced by an allowlist scrubber, not just convention); everything is
gated behind explicit consent except in demo mode. Full write-up, including
every event type/field, retention period, legal basis, and the redaction
guarantee: **[`docs/LOGGING.md`](docs/LOGGING.md)**.

- `npm run log:decode -- <file>` — NDJSON → readable table.
- `npm run log:report -- <file>` — cycle/funnel/time-on-task/error-rate
  metrics via the pure functions in `src/logging/analysis/`.
- Einstellungen → "Datenschutz & Protokoll" — consent toggle, export, delete.

**Measured size** (representative 800-event session — a TN submission with a
correction loop, several admin review actions, and normal navigation):

| | bytes/event | file size |
|---|---|---|
| Uncompressed NDJSON | ~62 | ~48 KB |
| Gzipped (as written by `FolderSink`/`FileDownloadSink`) | ~10 | ~8 KB |

Well under the 100 bytes/event (compressed) target. Projected volume,
assuming ~300 events per participant per month (initial submission plus a
correction loop and the usual navigation/admin actions) and a 90-day
retention window:

- **Per participant-month**: ~300 events × 10 bytes ≈ **3 KB gzipped**.
- **Per cohort-year** (formula — plug in the actual cohort size; the demo
  seed has 59 example participants, not a real cohort count): cohort size ×
  12 × 3 KB. For a cohort of 50, that's ≈ **1.8 MB/year** — small enough
  that the 20 MB total-size budget in `IndexedDbSink` and the 90-day
  retention window are both comfortably conservative, not binding
  constraints.

## Demo data

`src/adapters/mock/seedData.ts` is autogenerated from a dummy Excel export
and carries 59 synthetic participants; every field that could plausibly
identify a real person (bank IBAN, personal address, personal email,
free-text case remarks) is deliberately blanked, not merely fictionalized —
see `docs/DECISIONS.md` if a future data refresh reintroduces any of that.
The five demo logins in the role switcher (`src/adapters/mock/seed.ts`) are
clearly fictional names, unrelated to anyone who has worked on this project.

For the review build's Manager task specifically, three of those 59
participants get one further, review-build-only patch
(`src/adapters/mock/reviewTaskFixture.ts`): one is given a recorded
exception (the seed data otherwise never contains one — exceptions are only
ever added at runtime through the UI), and two others are marked ready for a
clean bulk approval, so the scripted task ("find the one exception, approve
the rest") is actually completable out of the box.

## Traceability

Code comments reference requirement IDs (FR-…/NFR-…), problem IDs (P1–P16)
and instruction sections (§I–§VI) from the Phase 1 report. **`REQUIREMENTS.md`**
maps every one of those citations to its acceptance criterion and
implementing file, and a build-time test fails if a citation in code has no
matching row. **`docs/DECISIONS.md`** records what was deliberately left
undone (and why), so a gap doesn't get mistaken for an oversight.
