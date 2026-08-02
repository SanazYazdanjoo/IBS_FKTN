# Requirements traceability

This table is extracted from the requirement IDs (`FR-…`/`NFR-…`) and problem
IDs (`P1`–`P16`) that already appear as code comments across the repo — it is
not a re-statement of the Phase 1 research report (that document lives
outside this repo), only a map from what's cited in code to where it's
implemented and how to check it still holds.

A build-time test (`src/domain/__tests__/requirements-coverage.test.ts`)
scans every source file for `FR-…`/`NFR-…`/`P\d+` citations and fails if one
is missing from this table — so a new requirement citation in a comment
can't silently go untracked.

Code also cites Instruction sections `§I`–`§VI` from the same Phase 1
document (`§I` ticket price/distance/comparison threshold, `§II` required
proofs, `§III` the unexcused-day rule, `§IV` the reimbursement formula and
standard phrases, `§VI` the <3&nbsp;km exception). Those aren't requirement
IDs in their own right, so they're folded into the relevant row's acceptance
criterion below rather than given their own rows.

| ID | Requirement | Source problem | Acceptance criterion | Implementing file(s) |
|---|---|---|---|---|
| NFR-01 | Participant data (bank details, AUs, signatures, attendance) never leaves the institute; no external SaaS; every actor sees only the records they're allowed to. | Cross-cutting (DSGVO/data protection) — not tied to one P-number. | A TN's queries return only their own records; any other actor/participant combination throws `AccessDeniedError`. The Google Sheets source is off by default and force-disabled in the review build regardless of the flag. | `src/adapters/types.ts`, `src/adapters/mock/mockAdapters.ts`, `src/adapters/excel/excelStorage.ts`, `src/domain/__tests__/access-control.test.ts` |
| NFR-03 | Every computed amount carries a full formula trace — no black-box numbers; TN, Admin and Manager screens render the same number from the same computation. | P3 | `ReimbursementResult.trace` is populated on every branch (pro-rata, PKW, VMT comparison) and rendered verbatim, not recomputed, by each screen. | `src/domain/reimbursement.ts` (§I/§IV/§VI), `src/domain/compute.ts`, `src/features/tn/TnFlow.tsx` |
| FR-01 | Automatic reminder emails at day 10 and day 14 of an open submission. | — | UI copy on the Dashboard describes the schedule; the send automation itself is **not implemented** — see `docs/DECISIONS.md`. `/reminder` is still a placeholder screen. | `src/features/admin/Dashboard.tsx` (copy only), `src/features/docs/Placeholders.tsx` (`AutoReminderEmails`) |
| FR-02 | The required-proof checklist per ticket type drives the upload UI directly, rather than a hand-maintained list. | P6 (submission completeness) | `requiredProofs()`'s output is exactly what the TN upload checklist renders; adding a ticket type means editing one function, not the UI. | `src/domain/submission.ts` (§II), `src/features/tn/TnFlow.tsx` |
| FR-05 | Admin has a dashboard giving a cross-month, cross-participant overview. | — | Dashboard renders the status distribution and a per-month table across every seeded month. | `src/features/admin/Dashboard.tsx`, `src/features/admin/DashboardOverview.tsx` |
| FR-06 | Admin dashboard surfaces the count of missing/pending documents ("Belege"). | — | Dashboard tallies `SubmittedDocument.state` across the active data source. | `src/features/admin/Dashboard.tsx` |
| FR-08 | Track whether a medical certificate (AU) was received for an absence day, independent of the attendance code itself. | — | `DayMarks.auReceived` exists, is toggleable from the Dozent weekly attendance view, and is counted in `summarizeAttendance().auCoveredDays`. | `src/domain/types.ts`, `src/domain/attendance.ts`, `src/features/dozent/Attendance.tsx`, `src/domain/__tests__/attendance.test.ts` |
| FR-09 | Two signature modes: Modus A (paper, today's reality) and Modus B (digital, pending DSB approval). | P7 (paper delay is invisible/unchaseable today) | `RuleConfig.signatureMode` switches the whole flow between an in-app authenticated click and paper tracking with a visible pending-day counter. Only Modus A is currently in production use — see `docs/DECISIONS.md`. | `src/domain/rules.ts`, `src/domain/types.ts` (`SignatureRecord`), `src/features/settings/SignatureSettings.tsx`, `src/features/tn/TnFlow.tsx` |
| FR-14 | Every signature/status action writes an audit-log line (who, when, what). | P7 | `logChange()` is called on every status and signature transition; entries persist in `localStorage` across a reload. | `src/app/auditLog.ts`, `src/features/settings/SignatureSettings.tsx` |
| P3 | A TN-visible amount must never be a black box. | — | Same acceptance criterion as NFR-03 above. | `src/domain/reimbursement.ts` |
| P4/P5 | A substitute/covering Dozent must be able to take over attendance duties without a paper handoff. | — | Any staff role (`STAFF_ROLES`) can open and edit any participant's attendance; nothing keys off "who normally does this." | `src/features/admin/Pipeline.tsx`, `src/adapters/types.ts` |
| P6 | The TN submission screen shows "vollständig ✓" only when every required proof is present, an "x/y vollständig" progress state otherwise. | — | Covered by both branches (complete and partial) in the test. | `src/domain/submission.ts`, `src/domain/__tests__/submission.test.ts` |
| P7 | Paper-signature waiting time must be visible and chaseable, not silently invisible. | — | `SignatureRecord.pendingSinceDays` is computed and rendered; `RuleConfig.deputyActivatesAfterDays` gates the deputy takeover (see P16). | `src/domain/types.ts`, `src/domain/rules.ts`, `src/features/tn/TnFlow.tsx` |
| P11 | Approved cases go straight to Buchhaltung digitally — no scan step, no secretary relay. | — | `ManagerQueue`'s approve action sets status directly to `SENT_TO_ACCOUNTING`; no intermediate manual step exists in the code path. | `src/features/manager/Queue.tsx` |
| P15 | The VMT single-fare comparison must use a maintained table, not a manual per-case lookup. | — | `vmtSingleFaresEur` is a plain object keyed by participant id, read directly by the comparison calculation. | `src/adapters/mock/seed.ts`, `src/domain/reimbursement.ts`, `src/domain/__tests__/reimbursement.test.ts` |
| P16 | A deputy/covering Manager must be able to approve after N days of the primary Manager's absence. | — | `deputyActivatesAfterDays` is a rule value; the queue screen surfaces the current deputy status. The activation itself is displayed, not automated — see `docs/DECISIONS.md`. | `src/domain/rules.ts`, `src/features/manager/Queue.tsx` |
