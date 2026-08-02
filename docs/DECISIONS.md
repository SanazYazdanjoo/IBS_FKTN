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
