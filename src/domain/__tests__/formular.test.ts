import { describe, expect, it } from 'vitest';
import { calculateReimbursement } from '../reimbursement';
import { defaultRules } from '../rules';
import {
  fillAbrechnungsformular,
  formularChecks,
  formularFileName,
} from '../../adapters/excel/formFiller';
import type { FormularData } from '../../adapters/excel/formFiller';
import { computeMonthView } from '../compute';
import type { MonthRecord } from '../types';

const eligible = { distanceKm: 23.4, hasApprovedDistanceException: false };

describe('PKW km-formula (from the official Formular: x 0,20 €/km)', () => {
  it('computes days × km × 2 × 0,20 with full trace', () => {
    const r = calculateReimbursement(
      {
        pkw: { distanceKm: 23.4 },
        ticketPriceEur: 49,
        workdaysInMonth: 21,
        reimbursableDays: 18,
        unexcusedDays: 0,
        eligibility: eligible,
      },
      defaultRules,
    );
    expect(r.method).toBe('PKW_KM');
    expect(r.amountEur).toBe(168.48); // 18 × 23.4 × 2 × 0.2
    expect(r.trace.pkw?.formula).toContain('18 Tage × 23.4 km × 2');
    expect(r.phrases).toContain('Erstattungsbetrag: 168,48 €');
  });

  it('3-km rule still gates PKW', () => {
    const r = calculateReimbursement(
      {
        pkw: { distanceKm: 2.8 },
        ticketPriceEur: 49,
        workdaysInMonth: 21,
        reimbursableDays: 18,
        unexcusedDays: 0,
        eligibility: { distanceKm: 2.8, hasApprovedDistanceException: false },
      },
      defaultRules,
    );
    expect(r.eligible).toBe(false);
    expect(r.amountEur).toBe(0);
  });
});

function makeRecord(overrides: Partial<MonthRecord> = {}): MonthRecord {
  return {
    participantId: 'PK01',
    participantName: 'Safaa Al Helal',
    month: '2026-01',
    ticketType: 'ABO',
    ticketPriceEur: 34, // Sozialticket 2026
    distanceKm: 4.7,
    hasPraktikum: false,
    workdaysInMonth: 21,
    documents: [
      { kind: 'TICKET_PHOTO', fileName: 'a.jpg', state: 'VERIFIED' },
      { kind: 'PAYMENT_PROOF', fileName: 'b.jpg', state: 'VERIFIED' },
    ],
    attendance: [],
    attendanceDaysOverride: 18,
    status: 'READY_FOR_APPROVAL',
    signature: { mode: 'PAPER', signedAt: '2026-02-01' },
    exceptions: [],
    ...overrides,
  };
}

function makeData(record: MonthRecord): FormularData {
  return {
    record,
    view: computeMonthView(record, defaultRules),
    master: {
      tnId: 'PK01', nachname: 'Al Helal', vorname: 'Safaa',
      strasse: 'Jakob-Kaiser-Ring', hausnr: '4', plz: '99087', ort: 'Erfurt',
      fahrtroute: 'Erfurt Stadtverkehr', entfernungKm: 4.7, kennzeichen: '',
      kontoinhaber: 'Safaa Al Helal', iban: 'DE00 0000', bank: 'Sparkasse', bic: 'HELADEF1WEM',
      email: '', verkehrsmittel: 'ÖPNV', ticket: 'Deutschlandticket', ticketart: 'Abo-karte',
      aboNummer: '', vmtZone: '', bemerkungen: '', lastUpdate: '', berechnung: '', cloud: '',
    },
    month: 1,
    year: 2026,
  };
}

describe('Formular checks (save gates)', () => {
  it('all green for a complete, signed, gap-free record', () => {
    const checks = formularChecks(makeData(makeRecord()));
    expect(checks.every((c) => c.ok)).toBe(true);
  });

  it('signature pending blocks the gate', () => {
    const checks = formularChecks(makeData(makeRecord({ signature: { mode: 'PAPER' } })));
    expect(checks.find((c) => c.label === 'Unterschrift TN')?.ok).toBe(false);
  });

  it('amount mismatch (Excel ≠ Engine) blocks the gate', () => {
    const checks = formularChecks(makeData(makeRecord({ amountOverride: 99 })));
    expect(checks.find((c) => c.label === 'Beträge stimmen überein')?.ok).toBe(false);
  });

  it('file name follows the documented pattern', () => {
    expect(formularFileName(makeRecord(), 1, 2026)).toBe('PK01_Abrechnung_2026-01.xlsx');
  });
});

describe('fills the REAL template (probe, sandbox only)', () => {
  it('writes name, ticket line, deduction, total and bank block into the template cells', async () => {
    const { readFileSync, existsSync } = await import('node:fs');
    const path = '/mnt/user-data/uploads/Template_FHKT_Abrechnung.xlsx';
    if (!existsSync(path)) return;
    const buf = readFileSync(path);
    const data = makeData(makeRecord());
    const filled = await fillAbrechnungsformular(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      data,
    );
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(filled);
    const ws = wb.worksheets[0];
    expect(ws.getCell('A6').value).toBe('Al Helal');
    expect(ws.getCell('D6').value).toBe('Safaa');
    expect(ws.getCell('K20').value).toBe(34);
    // 34 ÷ 21 × 18 = 29.14 → Abzug = 34 − 29.14 = 4.86
    expect(ws.getCell('K32').value).toBe(-4.86);
    expect(ws.getCell('K34').value).toBe(29.14);
    expect(ws.getCell('B40').value).toBe('DE00 0000');
    // template's own footer untouched
    expect(String(ws.getCell('D47').value)).toContain('IBS 0098');
  });
});
