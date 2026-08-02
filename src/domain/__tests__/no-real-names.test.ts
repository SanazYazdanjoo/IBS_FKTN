/**
 * Positive guards, replacing the old blocklist. The blocklist stored real
 * names in the repo in cleartext in order to ban them — that was itself
 * the problem (see docs/DECISIONS.md for the incident and date).
 *
 * 1. Every name in the generated seed (seedData.ts) must be traceable to
 *    the two demo workbooks it was built from (public/demo/*.xlsx) — never
 *    hand-typed, never left over from an earlier source.
 * 2. The legacy Zustand-cell compatibility literals in
 *    src/adapters/excel/values.ts (real staff first names, needed to parse
 *    real historical workbooks a real institute might upload) are read
 *    directly from that file's own export, so this test never types the
 *    names itself — and are confirmed to appear only in that file and its
 *    dedicated test.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import ExcelJS from 'exceljs';
import { LEGACY_ZUSTAND_LITERALS } from '../../adapters/excel/values';
import { RAW_SEED, RAW_MASTERS } from '../../adapters/mock/seedData';

const ROOT = process.cwd();
const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'dist-review', 'build', 'coverage']);
const BINARY_EXTENSIONS = new Set([
  '.woff2', '.woff', '.ttf', '.eot', '.png', '.jpg', '.jpeg', '.ico', '.gif',
  '.xlsx', '.zip', '.pdf',
]);

/** file (repo-relative, forward slashes) allowed to carry the legacy literal. */
const LEGACY_LITERAL_ALLOWLIST = new Set([
  'src/adapters/excel/values.ts',
  'src/domain/__tests__/excel.test.ts',
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (EXCLUDE_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (!BINARY_EXTENSIONS.has(entry.slice(entry.lastIndexOf('.')))) out.push(full);
  }
  return out;
}

function nameTokens(value: string | null | undefined): string[] {
  return (value ?? '')
    .split(/[\s\-–']+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

/** Every Nachname/Vorname token that appears in either demo workbook. */
async function rosterFromWorkbooks(): Promise<Set<string>> {
  const tokens = new Set<string>();

  const master = new ExcelJS.Workbook();
  await master.xlsx.readFile(join(ROOT, 'public/demo/Testdaten_Alle_TN_Daten.xlsx'));
  const masterSheet = master.worksheets.find((w) => w.name === 'Alle_TN_Daten')!;
  const header = masterSheet.getRow(1).values as unknown[];
  const col = (name: string) =>
    header.findIndex((h) => String(h ?? '').trim().toLowerCase() === name.toLowerCase());
  const nnCol = col('Nachname');
  const vnCol = col('Vorname');
  masterSheet.eachRow((row, n) => {
    if (n === 1) return;
    nameTokens(String(row.getCell(nnCol).value ?? '')).forEach((t) => tokens.add(t.toLowerCase()));
    nameTokens(String(row.getCell(vnCol).value ?? '')).forEach((t) => tokens.add(t.toLowerCase()));
  });

  const attendance = new ExcelJS.Workbook();
  await attendance.xlsx.readFile(join(ROOT, 'public/demo/Testdaten_Anwesenheitsliste.xlsx'));
  for (const sheet of attendance.worksheets) {
    if (!/^\d{4}$/.test(sheet.name)) continue; // only year sheets carry Nachname/Vorname (cols D/E)
    sheet.eachRow((row) => {
      nameTokens(String(row.getCell(4).value ?? '')).forEach((t) => tokens.add(t.toLowerCase()));
      nameTokens(String(row.getCell(5).value ?? '')).forEach((t) => tokens.add(t.toLowerCase()));
    });
  }

  return tokens;
}

describe('seedData.ts names are all traceable to the demo workbooks', () => {
  it('every RAW_SEED / RAW_MASTERS name token exists in the two demo workbooks', async () => {
    const roster = await rosterFromWorkbooks();

    const offenders: string[] = [];
    const check = (label: string, value: string | null | undefined) => {
      for (const token of nameTokens(value)) {
        if (!roster.has(token.toLowerCase())) offenders.push(`${label}: unrecognized token`);
      }
    };
    RAW_SEED.forEach((r, i) => {
      check(`RAW_SEED[${i}].nach`, r.nach);
      check(`RAW_SEED[${i}].vor`, r.vor);
    });
    RAW_MASTERS.forEach((r, i) => {
      check(`RAW_MASTERS[${i}].nachname`, r.nachname);
      check(`RAW_MASTERS[${i}].vorname`, r.vorname);
    });
    expect(offenders).toEqual([]);
  });
});

describe('legacy Zustand real-name literal stays isolated to its documented exception', () => {
  it('appears only in values.ts and its dedicated test', () => {
    const literals = Object.keys(LEGACY_ZUSTAND_LITERALS);
    const offenders: string[] = [];
    for (const file of walk(ROOT)) {
      const rel = relative(ROOT, file).replace(/\\/g, '/');
      if (LEGACY_LITERAL_ALLOWLIST.has(rel)) continue;
      const text = readFileSync(file, 'utf8').toLowerCase();
      if (literals.some((literal) => text.includes(literal))) {
        offenders.push(`${rel}: contains a legacy Zustand literal outside the documented exception`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('both allowlisted files still contain it (catches a silent rename/removal)', () => {
    for (const rel of LEGACY_LITERAL_ALLOWLIST) {
      const text = readFileSync(join(ROOT, rel), 'utf8').toLowerCase();
      const literals = Object.keys(LEGACY_ZUSTAND_LITERALS);
      expect(literals.some((l) => text.includes(l)), `${rel} should contain the legacy literal`).toBe(true);
    }
  });
});
