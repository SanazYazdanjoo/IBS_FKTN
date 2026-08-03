import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  parseYearTabName, discoverYearTabs, findOverallTab, pickYearTab,
} from '../../adapters/attendance/yearTabs';
import { LocalYearWorkbook } from '../../adapters/attendance/localYearWorkbook';

describe('Jahresblätter erkennen', () => {
  it('erkennt reine Jahreszahlen', () => {
    expect(parseYearTabName('2026')).toBe(2026);
    expect(parseYearTabName(' 2027 ')).toBe(2027);
    expect(parseYearTabName('Jahr 2028')).toBe(2028);
  });

  it('überspringt die bekannten Nicht-Jahres-Blätter', () => {
    for (const n of ['Regeln', 'Overall', 'Legende', 'Kalender']) {
      expect(parseYearTabName(n)).toBeNull();
    }
  });

  it('lehnt mehrdeutige Namen mit zwei Jahreszahlen ab', () => {
    expect(parseYearTabName('Archiv 2019-2024')).toBeNull();
  });

  it('sortiert gefundene Jahre aufsteigend', () => {
    expect(discoverYearTabs(['2026', 'Overall', '2025', 'Regeln']).map((t) => t.year))
      .toEqual([2025, 2026]);
  });

  it('findet das Overall-Blatt unabhängig von Schreibweise', () => {
    expect(findOverallTab(['2026', 'overall'])).toBe('overall');
  });

  it('weicht auf das jüngste frühere Jahr aus, wenn das gewünschte fehlt', () => {
    const tabs = discoverYearTabs(['2025', '2026']);
    expect(pickYearTab(tabs, 2026)?.year).toBe(2026);
    expect(pickYearTab(tabs, 2030)?.year).toBe(2026);
    expect(pickYearTab(tabs, 2000)?.year).toBe(2025);
  });
});

describe('Demo-Arbeitsmappe', () => {
  const buf = readFileSync('public/demo/Testdaten_Anwesenheitsliste.xlsx');

  it('entdeckt alle Jahre ohne Konfiguration, auch das leere Folgejahr', async () => {
    const wbk = await LocalYearWorkbook.fromBuffer(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
      'demo.xlsx',
    );
    expect(wbk.years).toEqual([2025, 2026, 2027]);
    expect(wbk.overallTabName).toBe('Overall');
  });

  it('stimmt überein — außer wo die Testdaten selbst eine Abweichung enthalten', async () => {
    const wbk = await LocalYearWorkbook.fromBuffer(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
      'demo.xlsx',
    );
    // Testdaten_Anwesenheitsliste.xlsx weicht in genau einem Fall zwischen
    // Tagesblatt und Overall-Blatt ab. Dort MUSS der Abgleich anschlagen —
    // genau dafuer ist er da. Ueberall sonst muss er schweigen.
    const mismatches: string[] = [];
    for (const year of wbk.years) {
      for (let m = 1; m <= 12; m += 1) {
        for (const c of wbk.readMonth(year, m).crossCheck) {
          if (!c.agrees) mismatches.push(`${year}-${m} ${c.tnId}`);
        }
      }
    }
    expect(mismatches).toEqual(['2026-2 PK09']);
  });

  it('liest alle Jahre in einem Durchgang', async () => {
    const wbk = await LocalYearWorkbook.fromBuffer(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
      'demo.xlsx',
    );
    const all = wbk.readAllYears();
    expect(all.size).toBe(36); // 3 Jahre x 12 Monate
    expect(all.has('2027-01')).toBe(true);
    // Das im Voraus angelegte, leere Blatt liefert keine Markierungen —
    // die Ansicht muss daraus 'nicht erfasst' machen, nicht 'null Tage'.
    expect([...(all.get('2027-03')?.marks.values() ?? [])].flat()
      .every((d) => d.morning === '' && d.afternoon === '')).toBe(true);
  });

  it('meldet BL-Zeilen nicht mehr als defekte TN-ID (BL ist ein gültiges Kürzel wie PK)', async () => {
    const wbk = await LocalYearWorkbook.fromBuffer(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
      'demo.xlsx',
    );
    const { warnings } = wbk.readMonth(2026, 3);
    expect(warnings).toEqual([]);
  });
});
