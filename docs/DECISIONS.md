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

**Where the official prices come from:** `src/domain/vmtTariff.ts` encodes
the VMT-Preisübersicht's "Einzelfahrt" row (adult, no BahnCard) — the only
ticket type the comparison formula (B) uses — for CityTarif (Erfurt, Weimar,
Jena, Gera), CityRegioTarif (Preisstufe 2–11), and RegioTarif (Preisstufe
1–11 plus Verbundweit), Stand 01.08.2025. The fare table's price input
offers these as a dropdown (`VMT_TARIFF_GROUPS`) next to free-text entry, so
an Admin normally *picks* a Preisstufe instead of typing a number — the
number itself becomes untypeable-wrong. Free-text entry stays available
for cases that don't map onto a Preisstufe (a negotiated "VMT
Gesamtnetz" contract, for instance); picking one vs. typing one is recorded
per fare (`VmtFareRecord.tariffZoneId`, shown in the Zone column) so a
reviewer can tell which fares are traceable to the published tariff and
which were a judgment call. When VMT next republishes prices, updating
`vmtTariff.ts` is the one place that needs to change — every fare picked
from the dropdown stays traceable to a Stand, but existing manually-entered
fares are **not** revalidated automatically (no code re-checks a free-typed
number against a newer tariff); that stays a manual review step.

**2026-08-04 update — the five-file gap above is closed:** `Dashboard.tsx`,
`DashboardOverview.tsx`, `TnFlow.tsx`, `Formular.tsx`, and `Queue.tsx` now
all call `useVmtFares()` and derive their lookup with `toFareLookup(fares)`
locally, the same pattern `TnDetail.tsx` and `/vergleichsrechnung` already
used. Every reader in the app now recomputes from the live context, so a
fare edited on `/vergleichsrechnung` is reflected everywhere immediately —
no reload needed. The now-unused seed snapshot (`vmtSingleFaresEur` in
`src/adapters/mock/seed.ts`, derived once from `vmtFaresSeed` at load) was
deleted along with its now-dead `toFareLookup` import in that file, since
nothing reads it anymore. Still true: this all still lives in-memory, not
behind `StorageAdapter` — see "Where this stops being enough" above.

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

## 2026-08-04 — Low-literacy/language-barrier TN path (FR-15): `P1` is an unverified placeholder

`REQUIREMENTS.md` cites `P1` for "the TN with the lowest digital literacy and
weakest German must be able to submit unaided" (persona: needs a family
member's help for basic digital tasks, e.g. the cloud folder). `P1`–`P16`
are supposed to trace back to problem numbers in the Phase 1 persona
research report, which — per the note at the top of `REQUIREMENTS.md` —
lives outside this repo. That report was not available while building this
feature, and none of the fifteen `P`-numbers already cited in code
(`P3`–`P7`, `P11`, `P15`, `P16`) come with a description matching this
persona, so there was no way to confirm which number, if any, the report
actually assigns to it.

**What was done:** assigned `P1` (the lowest free slot) as an explicit,
flagged placeholder — marked with ⚠️ in its `REQUIREMENTS.md` row rather
than presented as settled fact — so the traceability test
(`requirements-coverage.test.ts`) still passes honestly (a real row exists,
not a substring-match accident) while a reviewer with access to the actual
report can correct the number without archaeology.

**Why not leave the citation out entirely:** every other persona-driven
requirement in this codebase cites its source problem; doing the same here,
clearly flagged as unverified, is more useful to a future reader than
silently deviating from that convention.

**Where this stops being enough:** the first time someone with the Phase 1
report touches this code, `P1` in `REQUIREMENTS.md` and the three source
comments citing it (`src/features/tn/TnFlowStepMode.tsx`,
`src/features/tn/tnFlowState.ts`, `src/features/tn/PhotoCapture.tsx`) should
be corrected to the report's actual number, and this entry can be deleted.

## 2026-08-04 — TN flow i18n: `de`/`en` only, TN flow only, no i18next

`src/i18n/` ships a typed key→string map (`TnFlowStrings`) instead of a
framework like i18next, and only for `src/features/tn/` — Admin, Dozent,
Manager and Accounting screens are still German-only literals.

**Why not i18next:** the review build (`VITE_REVIEW_BUILD=1`) is a single
offline HTML file (`vite-plugin-singlefile`,
`review-build-no-external-urls.test.ts`); the TN flow's vocabulary is a few
dozen short strings, which two flat objects and a `useT()` hook solve
without pulling in a message parser, plugin system and namespace loader
whose weight nothing here needs.

**Why not a whole-app extraction:** the task this responds to (a low-
literacy/non-native TN path) only requires the TN flow to be navigable in a
second language; extracting Admin/Dozent/Manager copy too would be a much
larger, separately-reviewable change with no persona need driving it yet.

**Why `en` as the second locale, not something Aesha-specific:** the persona
research names a family that helps her but doesn't specify a language she
reads more comfortably than German; `en` was picked only to prove the
mechanism (two locales, a working switch, no dead code paths), not as a
claim about what she actually needs. Swapping in whichever language is
actually useful means adding one object to `src/i18n/translations.ts` — no
other file changes.

**What was NOT done:** per-participant locale persistence (the choice is
stored per browser, in `localStorage`, not tied to a TN's account — a
second device starts back at `de`); machine or human translation review of
the `en` strings by a fluent speaker (they were written directly, not
reviewed); and translating `app/ui.tsx`'s shared components (`StatusPipeline`
status labels, `Card`/button chrome elsewhere) or any non-TN screen.

## 2026-08-04 — Schritt-für-Schritt mode: scope cuts

The guided mode (`src/features/tn/TnFlowStepMode.tsx`) covers ticket-type
selection, one-proof-at-a-time capture, review and submit, and reuses the
existing `SignatureTask` for the signature step. **Not covered:** a guided
version of `TnCorrection.tsx` (the correction-loop screen for a rejected
document) — a TN routed there today still sees the standard correction UI
regardless of which TN-flow mode they were last in. Extending step mode to
that screen was left out because the correction flow has its own,
differently-shaped state (a single document's rejection reason, not a
checklist) and folding it into this pass would have widened the change well
beyond what P1/FR-15 asked for. Worth doing together, since a TN who needed
the guided path to submit likely needs it just as much to fix a rejected
document.

## 2026-08-04 — Vergleichsrechnung: task premise didn't match the repo, and a real gap found underneath

A task asked to "replace the Vergleichsrechnung placeholder in
`src/features/docs/Placeholders.tsx`" and "remove the `pending: true` flag"
on its nav item. Neither exists: `Placeholders.tsx` only ever had
`AutoReminderEmails`/`Documentation`, `src/features/admin/Vergleichsrechnung.tsx`
was already a real, routed screen, and its nav item never had `pending: true`.
`ReimbursementResult` also has no `total` field (`amountEur` is the one
used everywhere). This entry records what was actually done instead of
silently reinterpreting a task written against a different repo state.

**What was found and fixed:** the existing screen didn't render
`trace.chosenBecause` (the plain-language "why A or B won") or
`result.phrases` (the §IV standard phrases) anywhere, and its options table
recomputed the VMT amount in the UI (`roundEuro(reimbursableDays * 2 *
priceEur)`) even for the row matching the fare the engine had actually
used — a real NFR-03 gap. `src/features/admin/comparisonDisplay.ts` now
gives the screen a single derivation (`buildComparisonDisplay`) that reads
`result.trace`/`result.phrases`/`result.method` verbatim; only rows the
Admin adds interactively (which the engine has never priced) are computed
in the UI. The worklist now also surfaces a flipped-case count and a
per-row badge, answering "which cases flipped, and why" directly instead
of requiring the Admin to open every detail panel.

**Bigger gap found while doing this:** `VmtFaresProvider.setFarePrice()` —
the function that actually persists a fare — was never called from
anywhere in the app. The "editable" options table only changed local,
unsaved component state; an Admin had no way to actually resolve a "Preis
fehlt" blocker. Wired a "Als Fahrpreis speichern" button (canEdit only)
that calls `setFarePrice()` directly, since the mechanism already existed
and needed only a caller — this is presentation, not new domain logic.

**Known follow-up, left as-is:** after saving, the just-saved row keeps
computing its amount locally (`isEngineRow` doesn't flip back to `true`
until the component remounts) rather than immediately switching to reading
`trace.vmt` verbatim. The number is identical either way (same formula,
same inputs, same `roundEuro`), so this isn't a correctness bug, only a
missed opportunity to re-derive `isEngineRow` from a `fareEntry` change via
an effect. Left out to keep this change to what P15/NFR-03 asked for.
