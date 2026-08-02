#!/usr/bin/env node --experimental-transform-types
/**
 * npm run seed:build
 *
 * Regenerates src/adapters/mock/seedData.ts from the two committed demo
 * workbooks in public/demo/ — the ONLY permitted source of demo data:
 *  - Testdaten_Alle_TN_Daten.xlsx   (Stammdaten + monatliche Übersicht)
 *  - Testdaten_Anwesenheitsliste.xlsx (Tagesmarkierungen je Monat)
 *
 * Both are read through the same adapters the app uses at runtime —
 * ExcelWorkbookSource for the master/Übersicht workbook, LocalYearWorkbook
 * (the Jahresblatt-Layout reader also used by the "load demo file" button
 * in DataSourceSettings.tsx) for the attendance workbook — so the seed has
 * exactly the shape a live-loaded workbook would produce. No hand editing,
 * no invented fields. Fields the workbooks don't populate are left blank.
 *
 * Never point this at a real export. Re-run after editing either workbook;
 * never hand-edit seedData.ts.
 *
 * Run directly with Node's TypeScript type stripping — every relative
 * import carries an explicit .ts extension, matching scripts/log-decode.ts.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ExcelWorkbookSource } from '../src/adapters/excel/workbook.ts';
import { LocalYearWorkbook } from '../src/adapters/attendance/localYearWorkbook.ts';
import { GERMAN_MONTHS } from '../src/adapters/excel/attendanceWorkbook.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MASTER_FILE = join(ROOT, 'public/demo/Testdaten_Alle_TN_Daten.xlsx');
const ATTENDANCE_FILE = join(ROOT, 'public/demo/Testdaten_Anwesenheitsliste.xlsx');
const OUT_FILE = join(ROOT, 'src/adapters/mock/seedData.ts');
const YEAR = 2026;

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

interface RawSeedRecord {
  m: number;
  id: string;
  nach: string;
  vor: string;
  workdays: number;
  status: string;
  ticketType: string;
  price: number;
  dist: number;
  plate: string | null;
  sozial: boolean;
  hasPraktikum: boolean;
  docs: { kind: string; fileName: string; state: string }[];
  att: [string, string, string][];
  notes: Record<string, string> | null;
  signedAt: string | null;
}

async function main(): Promise<void> {
  const masterSource = await ExcelWorkbookSource.load(toArrayBuffer(readFileSync(MASTER_FILE)));
  if (!masterSource.report.ok) {
    console.error('Testdaten_Alle_TN_Daten.xlsx failed validation:', masterSource.report.errors);
    process.exit(1);
  }
  const masters = masterSource.readMaster();

  const attendance = await LocalYearWorkbook.fromBuffer(
    toArrayBuffer(readFileSync(ATTENDANCE_FILE)),
    'Testdaten_Anwesenheitsliste.xlsx',
  );

  const rawSeed: RawSeedRecord[] = [];
  const monthsWithData = new Set<number>();

  for (let month = 1; month <= 12; month += 1) {
    const { rows } = masterSource.readMonth(month, YEAR);
    if (rows.length === 0) continue;
    monthsWithData.add(month);

    const { marks: dayMarks, notes } = attendance.readMonth(YEAR, month);

    for (const { record } of rows) {
      const tnId = record.participantId;
      const master = masters.get(tnId.toUpperCase());
      const att: [string, string, string][] = (dayMarks.get(tnId.toUpperCase()) ?? []).map((d) => [
        d.date,
        d.morning,
        d.afternoon,
      ]);

      rawSeed.push({
        m: month,
        id: tnId,
        nach: master?.nachname ?? '',
        vor: master?.vorname ?? '',
        workdays: record.workdaysInMonth,
        status: record.status,
        ticketType: record.ticketType,
        price: record.ticketPriceEur,
        dist: master?.entfernungKm ?? 0,
        plate: master?.kennzeichen || null,
        // ticketPriceEur is computed purely from the Sozial-D-Ticket flag
        // (workbook.ts SOZIAL_PRICES[year]); back-derive rather than
        // re-reading the flag, which readMonth() doesn't expose.
        sozial: record.ticketPriceEur === 34,
        hasPraktikum: record.hasPraktikum,
        docs: record.documents,
        att,
        notes: notes.get(tnId.toUpperCase()) ?? null,
        signedAt: record.signature.signedAt ?? null,
      });
    }
  }

  if (rawSeed.length === 0) {
    console.error('No Übersicht rows found for year ' + YEAR + ' — nothing to write.');
    process.exit(1);
  }

  const rawMasters = [...masters.values()];
  const maxMonth = Math.max(...monthsWithData);
  const monthLabels = GERMAN_MONTHS.slice(0, maxMonth);

  const header = `/** AUTOGENERIERT aus public/demo/Testdaten_Alle_TN_Daten.xlsx +
 *  public/demo/Testdaten_Anwesenheitsliste.xlsx (beides Testdaten).
 *  Nicht von Hand editieren — Quelle sind die beiden Workbooks.
 *  Neu erzeugen: npm run seed:build
 */
export interface RawSeedRecord {
  m: number; id: string; nach: string; vor: string;
  workdays: number; status: string; ticketType: string; price: number;
  dist: number; plate: string | null; sozial: boolean; hasPraktikum: boolean;
  docs: { kind: string; fileName: string; state: string }[];
  att: [string, string, string][];
  notes: Record<string, string> | null;
  signedAt: string | null;
}

export const MONTH_LABELS = ${JSON.stringify(monthLabels)};

export const RAW_SEED: RawSeedRecord[] = ${JSON.stringify(rawSeed, null, 2)};

/** Stammdaten aus dem Tab 'Alle_TN_Daten' (Testdaten). */
export const RAW_MASTERS = ${JSON.stringify(rawMasters, null, 2)} as const;
`;

  writeFileSync(OUT_FILE, header);

  console.log(`Wrote ${OUT_FILE}`);
  console.log(`  participants: ${rawMasters.length}`);
  console.log(`  month records: ${rawSeed.length} (months 1..${maxMonth})`);
}

main();
