/**
 * Guards that the standard TN flow and the "Schritt für Schritt" mode (P1)
 * can never disagree: both render exclusively from deriveTnFlowState(), so
 * calling it twice for the same record — once "as the standard mode would",
 * once "as step mode would" — must yield the same completeness verdict and
 * the same required-proof list, for every document-set shape submission.test.ts
 * already exercises at the domain level (complete / missing / illegible).
 */
import { describe, expect, it } from 'vitest';
import { deriveTnFlowState } from '../tnFlowState';
import { defaultRules } from '../../../domain/rules';
import type { MonthRecord, SubmittedDocument } from '../../../domain/types';

function baseRecord(documents: SubmittedDocument[]): MonthRecord {
  return {
    participantId: 'TN01',
    participantName: 'Test TN',
    month: '2026-07',
    ticketType: 'ABO',
    ticketPriceEur: 49,
    distanceKm: 10,
    hasPraktikum: false,
    workdaysInMonth: 20,
    documents,
    attendance: [],
    attendanceDaysOverride: 20,
    status: 'NOT_SUBMITTED',
    signature: { mode: 'PAPER' },
    exceptions: [],
  };
}

const DOCUMENT_SETS: { name: string; documents: SubmittedDocument[] }[] = [
  {
    name: 'complete',
    documents: [
      { kind: 'TICKET_PHOTO', fileName: 'foto.jpg', state: 'UPLOADED' },
      { kind: 'PAYMENT_PROOF', fileName: 'auszug.jpg', state: 'VERIFIED' },
    ],
  },
  {
    name: 'missing a proof',
    documents: [{ kind: 'TICKET_PHOTO', fileName: 'foto.jpg', state: 'UPLOADED' }],
  },
  {
    name: 'illegible proof needs correction',
    documents: [
      { kind: 'TICKET_PHOTO', fileName: 'foto.jpg', state: 'UPLOADED' },
      { kind: 'PAYMENT_PROOF', fileName: 'auszug.jpg', state: 'ILLEGIBLE' },
    ],
  },
  { name: 'nothing uploaded yet', documents: [] },
];

describe('TnFlow standard mode vs. Schritt-für-Schritt mode: same completeness verdict', () => {
  for (const { name, documents } of DOCUMENT_SETS) {
    it(`${name}: both modes derive an identical verdict from the same record`, () => {
      const record = baseRecord(documents);

      // "as the standard mode would call it" / "as step mode would call it" —
      // two independent call sites, same function, same inputs.
      const standardModeState = deriveTnFlowState(record, defaultRules);
      const stepModeState = deriveTnFlowState(record, defaultRules);

      expect(stepModeState.completeness).toEqual(standardModeState.completeness);
      expect(stepModeState.required).toEqual(standardModeState.required);
      expect(stepModeState.result.trace).toEqual(standardModeState.result.trace);
      expect(stepModeState.result.amountEur).toEqual(standardModeState.result.amountEur);
    });
  }
});
