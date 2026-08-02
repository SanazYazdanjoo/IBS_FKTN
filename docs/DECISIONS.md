# Decisions — what was deliberately not done, and why

This is not a backlog. It records choices made on purpose, so a future
reader doesn't mistake an intentional gap for an oversight and "fix" it
without the context below.

## Signature Modus A (Papier) vs. Modus B (digital) — pending a Finance ruling

`RuleConfig.signatureMode` (`src/domain/rules.ts`) supports both modes and
both are implemented end to end (`src/features/settings/SignatureSettings.tsx`,
`src/features/tn/TnFlow.tsx`, FR-09/FR-14 — see `REQUIREMENTS.md`). Only
Modus A (paper) is in production use.

**Why not switch the default to Modus B:** an authenticated in-app click
needs a ruling from Finance/the data protection officer (DSB) on whether it
satisfies the institute's signature requirements for a reimbursement claim.
That ruling hasn't happened yet. Flipping the default before it does would
put a data-protection question into the reviewers' hands, not the app's.
The code is ready either way — this is a governance blocker, not a technical
one.

## Google Sheets attendance source — removed from the default path (NFR-01)

`src/adapters/attendance/googleSheetsSource.ts` sends the spreadsheet ID and
API key to `sheets.googleapis.com` — a real external SaaS call. That
contradicts NFR-01 ("no external SaaS; participant data never leaves the
institute") on its face, so it can't be reachable in anything handed to an
outside reviewer.

**What was actually done:** not deleted, because it's a working, read-only,
locally-useful tool for anyone experimenting with the institute's own
Anwesenheitsliste outside a real cohort. Instead:
- Gated behind `VITE_ENABLE_SHEETS_SOURCE`, off by default.
- Forced off unconditionally when `VITE_REVIEW_BUILD=1`, regardless of that
  flag (`src/app/reviewBuild.ts`).
- Statically un-importable from the main bundle — the adapter is loaded via
  a dynamic `import()` only inside the connect handler
  (`src/features/settings/DataSourceSettings.tsx`), so the module (and the
  URL string in it) sits in its own chunk, not the app's main bundle.
- Covered by a build-time test that fails if an unexpected external host
  shows up anywhere in the review build's output
  (`src/domain/__tests__/review-build-no-external-urls.test.ts`).

**Why not delete it outright:** it's genuinely useful for someone at the
institute who wants to pull the live Anwesenheitsliste into the app locally
while developing, without any of that ever being a path a cohort's real data
can travel through the review build. Gating gets both.

## Deputy/Vertretung rule — displayed, not automated (P16)

`RuleConfig.deputyActivatesAfterDays` (`src/domain/rules.ts`) and the queue
screen (`src/features/manager/Queue.tsx`) show *that* a deputy activates
after N days of manager absence, and read the configured threshold. There is
no code that tracks actual absence, and no automated handover of approval
rights to a deputy account.

**Why not automate it:** doing so correctly needs a real notion of "the
manager is currently away" (a calendar integration, an out-of-office flag,
or a manual toggle with its own audit trail) — none of which exists yet, and
inventing one for a prototype risks presenting a governance mechanism the
institute hasn't actually signed off on. Surfacing the rule and its
threshold keeps the requirement visible and testable (P16, `REQUIREMENTS.md`)
without quietly deciding, on the institute's behalf, how "manager absence"
gets detected.

## VMT-Einzelfahrpreis-Tabelle — in-memory context, not adapter-persisted (P15)

`src/domain/vmtFares.ts` defines the fare table shape (`VmtFareTable`); at
runtime it lives in `src/app/vmt-fares-context.tsx` (`VmtFaresProvider`),
the same in-memory-context pattern as `RulesProvider`
(`src/app/rules-context.tsx`). Editing a fare on `/vergleichsrechnung`
updates that context directly, which every reader downstream of it
recomputes from immediately (no separate "recalculate" step).

**Why in-memory, not behind `StorageAdapter`:** the rest of the app's
data — attendance, documents, status — already goes through
`StorageAdapter`, and in principle the fare table could too. It doesn't yet
for the same reason `RuleConfig` doesn't: there is no real backend behind
the mock adapter for either to persist into, and inventing one only for
this table would be presentational (data resets on reload either way, same
as every other rule/config value in the app today). Following the existing
`RulesProvider` convention keeps the two "small, admin-maintained config
tables" in the app consistent with each other instead of one gaining a
different persistence story than the other for no functional reason.

**Where this stops being enough:** the moment a real deployment persists
`MonthRecord`s (the Excel adapter, or a future backend), the fare table
should move behind `StorageAdapter` too, so a fare survives a reload the
same way an attendance mark does. Until then, `vmtFaresSeed` in
`src/adapters/mock/seed.ts` supplies the starting values each session.

**Known gap:** only `TnDetail.tsx` and `/vergleichsrechnung` itself read
`VmtFaresProvider` live. `Dashboard.tsx`, `DashboardOverview.tsx`,
`TnFlow.tsx`, `Formular.tsx`, and `Queue.tsx` still read the seed snapshot
(`vmtSingleFaresEur`, derived once from `vmtFaresSeed` at load) rather than
the live context, so a fare edited on `/vergleichsrechnung` won't be
reflected there until reload. Migrating those five call sites was left out
of this change on purpose — the approval queue and the Formular filler are
explicitly out of scope for the Vergleichsrechnung work, and touching the
Dashboard screens for this alone would widen the change for no requirement
that asked for it. Worth revisiting together with the `StorageAdapter`
migration above, at which point every reader would naturally go through
one adapter call instead of two parallel sources.

## Auto-Reminder emails — copy only, no send automation (FR-01)

The Admin dashboard (`src/features/admin/Dashboard.tsx`) describes an
automatic reminder at day 10 and day 14 of an open submission. `/reminder`
(`src/features/docs/Placeholders.tsx`, `AutoReminderEmails`) is still an
explicit placeholder screen — nothing sends an email.

**Why:** email sending needs a real outbound mail path (SMTP relay,
addresses, a send log), which is out of scope for a prototype that otherwise
has no backend and no network transmission by design (see the project's
non-goals). Promising the schedule in the dashboard copy, while the actual
automation is absent, is itself worth a reviewer's attention — that's part
of why it's called out here rather than silently left inconsistent.

## 2026-08-02 — Incident: the demo seed contained real participant data

`src/adapters/mock/seedData.ts` (`RAW_SEED`, `RAW_MASTERS`) had, since it was
first introduced, been generated from a real Excel export of an actual
course cohort — names, license plates, commute routes and distances, and (in
a handful of records) bank account holder/bank/BIC. The README and this
file's own docstring called it synthetic; that claim was false. This is a
DSGVO Art. 4/5 problem, and it directly contradicted NFR-01 and the
review-build hardening's data-isolation claims.

**What was found (full inventory kept out of this file — file/field
locations only, no values):** real names in `RAW_SEED`/`RAW_MASTERS`
(100% of records), real license plates and Fahrtroute/Entfernung values, a
real participant's first name leaked into a code comment in
`src/adapters/mock/seed.ts` (outside the seed data itself, so undetected by
the then-existing guard), and real staff first names stored in cleartext in
`src/domain/__tests__/no-real-names.test.ts` — the file whose entire purpose
was to ban real names from the repo.

**What was done:** `seedData.ts` is now generated exclusively from two
committed, reviewed demo workbooks (`public/demo/Testdaten_Alle_TN_Daten.xlsx`,
`public/demo/Testdaten_Anwesenheitsliste.xlsx`) via `npm run seed:build`
(`scripts/build-seed.ts`) — see the "Demo data" section of `README.md`.
`no-real-names.test.ts` was rewritten from a cleartext blocklist to a
positive check: every name in the generated seed must trace back to one of
the two workbooks. The real participant's first name was removed from the
`seed.ts` comment.

**What was NOT done, on purpose:** git history was **not** rewritten. Every
commit from the seed's introduction onward (`0113c53` through the commit
before this one) still contains the real data in `seedData.ts`'s history,
and the real staff names that were in `no-real-names.test.ts` are similarly
still recoverable from history. Rewriting history (`git filter-repo`)
changes every commit SHA after the rewrite point, requires a force-push, and
does not retroactively scrub any clone or fork already taken from this repo
— consequences serious enough that they need an explicit decision by
whoever owns this repository, not a default action taken as part of a data
cleanup. Until that decision is made, treat the git history of this
repository (not just its current working tree) as containing real personal
data, and restrict access accordingly.

**Also out of scope for this pass:** `public/assets/documentation.svg` (a
UML/process diagram asset with a few short tokens that coincidentally
overlap the old real roster — not conclusively investigated) and any
already-built artefacts (`dist-review/`, exported zips) from before this
change, which may still embed the old seed and should not be redistributed.
