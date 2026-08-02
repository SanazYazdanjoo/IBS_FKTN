# IBS Fahrtkostenerstattung — Prototype

Functional prototype for digitalizing the travel-cost reimbursement workflow
(LAT Sprint Qualifizierung). Built as part of an HCI research project:
Phase 1 (thematic analysis, personas, journeys, requirements) → Phase 2
(wireframes, Claude Design) → **Phase 3 (this repo)** → Phase 4 (evaluation).

## Quick start

```bash
npm install
npm test        # 24 domain tests — must stay green
npm run dev     # shell with role switcher at localhost:5173
```

## Architecture decisions (and why)

**1. Domain logic is pure and tested (`src/domain/`).**
Attendance rules, the reimbursement formula, the VMT Vergleichsrechnung,
the 3-km rule, submission completeness, and approval flags are pure
TypeScript functions with a Vitest suite. Every result carries a full
`trace`, so the TN screen, the Admin detail, and the Manager summary render
the *same* numbers from the *same* computation (NFR-03: no black-box
amounts — the root fix for Problem 3).

**2. The open E/K rule question is a single flag.**
`RuleConfig.sickDaysAreReimbursable` in `src/domain/rules.ts` encodes the
documented conflict between the Fahrkosten instruction ("x, E = present")
and the Anwesenheitsberechnung (E, K, X, (x) count). Default: `true`
(the legend reading — K/Kulanztag counts as reimbursable). When die Leitung
decides otherwise, flip one boolean; tests cover both paths. Presence-for-the-list and
reimbursable-for-the-money are deliberately separate concepts in
`attendance.ts`.

**3. Persistence and identity live behind adapters (`src/adapters/`).**
The app only ever talks to `StorageAdapter` / `AuthAdapter`. The prototype
ships `MockAdapter` (in-memory, seeded with the wireframe cast). For
production, IT implements the same interfaces against the IBS-owned cloud
(e.g. Nextcloud WebDAV/OCS with existing LDAP accounts). No external SaaS:
participant data — bank statements, AUs, signatures — never leaves the
institute (NFR-01/DSGVO).

**4. Data isolation is enforced in the adapter, not the UI.**
A TN actor's queries return only their own records; requesting anything
else throws `AccessDeniedError`. The role switcher in the app shell
demonstrates this live: switch to "Yusuf" and the application state simply
contains no one else's data. Privacy by design, not by CSS. Covered by
`access-control.test.ts`.

**5. Rules are data, not scattered code.**
Prices, thresholds, the signature mode (Modus A Papier / Modus B digital,
FR-09), and the deputy-activation delay (P16) all live in `RuleConfig`.
VMT single fares are a maintained table in the seed (`vmtSingleFaresEur`),
replacing the manual lookup (P15).

**6. The UI shell is a placeholder on purpose.**
`src/app/App.tsx` proves the wiring auth → adapter → engine → screen.
Build the real screens per the Claude-Design wireframes in
`src/features/<role>/` (tn, admin, dozent, manager, settings), styled with
the Ink & Bloom tokens already mapped in `tailwind.config.js`.

## Event log (usage analytics)

`src/logging/` records how the process is actually used — cycle times,
correction loops, drop-off points, pipeline-stage durations, calculation-vs-
Excel disagreement rates, error rates — as a local-only, pseudonymous NDJSON
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
- **Per cohort-year** (formula — plug in the actual cohort size; the seed
  cast below has 5 example participants, not a real cohort count): cohort
  size × 12 × 3 KB. For a cohort of 50, that's ≈ **1.8 MB/year** — small
  enough that the 20 MB total-size budget in `IndexedDbSink` and the 90-day
  retention window are both comfortably conservative, not binding
  constraints.

## Seed cast (mirrors the wireframes)

| Participant | Case | Expected amount |
|---|---|---|
| Yusuf A. | Standard: 19 days, 2 AU, 1 unexcused, ✎ Frist exception, paper-signed 17.07. | 42,32 € |
| Maria K. | Correction loop: Kontoauszug missing | — |
| Ahmad S. | 8 days < 2 weeks → VMT comparison wins | 17,60 € |
| Omar B. | Signature pending 6 days (Modus A visibility, P7) | 46,77 € |
| Deniz Ö. | 2,8 km → needs approved < 3-km exception (§VI) | 0 € until approved |

## Traceability

Code comments reference requirement IDs (FR-…/NFR-…), problem IDs (P1–P16)
and instruction sections (§I–§VI) from the Phase 1 report, so every design
decision in code is auditable back to research evidence.
