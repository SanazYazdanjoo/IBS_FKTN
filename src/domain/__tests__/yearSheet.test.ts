import { describe, expect, it } from 'vitest';
import {
  parseYearSheetBlocks,
  readMonthFromYearSheet,
  type MalformedRow,
} from '../../adapters/attendance/yearSheetLayout';
import { readOverallMonth, crossCheckMonth } from '../../adapters/attendance/overallTab';
import { countMonthPresence, isPresenceDay } from '../attendance';
import type { DayMarks } from '../types';

/** Minimales Raster im Jahresblatt-Layout (Spalten A..X). */
function grid(rows: (string | undefined)[][]): string[][] {
  return rows.map((r) => Array.from({ length: 24 }, (_, i) => r[i] ?? ''));
}

const HEADER = [
  'JANUAR', 'KW2', 'TN-ID', 'Nachname', 'Vorname',
  'M 5.01', '', 'D 6.01', '', 'M 7.01', '', 'D 8.01', '', 'F 9.01', '',
  'S 10.01', '', 'S 11.01', '', 'Anmerkungen',
];
const VN = ['', '', '', '', '', 'V', 'N', 'V', 'N', 'V', 'N', 'V', 'N', 'V', 'N', 'V', 'N', 'V', 'N'];

describe('Jahresblatt-Layout', () => {
  it('liest TN-ID aus Spalte C und Tage ab Spalte F', () => {
    const g = grid([
      HEADER,
      VN,
      ['', '', 'PK01', 'Al Helal', 'Safaa', 'E', 'E', 'X', '(x)', 'U', 'U', 'A', 'A', 'X', 'X'],
    ]);
    const marks = readMonthFromYearSheet(g, 2026, 1).get('PK01')!;
    expect(marks).toHaveLength(5);
    expect(marks[0]).toEqual({ date: '2026-01-05', morning: 'E', afternoon: 'E' });
    expect(marks[2]).toEqual({ date: '2026-01-07', morning: 'U', afternoon: 'U' });
  });

  it('parst nur Mo–Fr, weil die Wochenformel Sa/So nicht summiert', () => {
    const g = grid([HEADER, VN, ['', '', 'PK01', 'A', 'B']]);
    const [block] = parseYearSheetBlocks(g, 2026);
    expect(block.days.map((d) => d.date)).toEqual([
      '2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08', '2026-01-09',
    ]);
  });

  it('verwirft den leeren Dublettenblock (KW1/KW2 mit gleichen Tagen)', () => {
    const g = grid([
      ['JANUAR', 'KW1', 'TN-ID', 'Nachname', 'Vorname', 'M 5.01', '', 'D 6.01'],
      VN,
      ['', '', 'PK01', 'Al Helal', 'Safaa'], // leer
      HEADER,
      VN,
      ['', '', 'PK01', 'Al Helal', 'Safaa', 'X', 'X'], // gefüllt
    ]);
    expect(parseYearSheetBlocks(g, 2026)).toHaveLength(1);
    const marks = readMonthFromYearSheet(g, 2026, 1).get('PK01')!;
    expect(marks.filter((m) => m.date === '2026-01-05')).toHaveLength(1);
    expect(marks[0].morning).toBe('X');
  });

  it('erkennt geteilte Wochen, deren zweiter Block erst in Spalte J beginnt', () => {
    // Reale Form der Woche 30.03.–03.04.: Mo/Di in Spalte F, danach ein
    // eigener Block mit Mi/Do/Fr ab Spalte J (F..I leer).
    const g = grid([
      ['MÄRZ', '', 'TN', '', '', 'M 30.03', '', 'D 31.03', '', '', '', '', '', '', '', '', '', '', '', 'Anmerkungen'],
      VN,
      ['', '', 'PK01', 'Al Helal', 'Safaa', 'X', 'X', 'X', 'X'],
      [],
      ['APRIL', '', 'TN', '', '', '', '', '', '', 'M 1.04', '', 'D 2.04', '', 'F 3.04', '', '', '', '', '', 'Anmerkungen'],
      VN,
      ['', '', 'PK01', 'Al Helal', 'Safaa', '', '', '', '', 'X', 'X', 'X', 'X', 'X', 'X'],
    ]);
    const blocks = parseYearSheetBlocks(g, 2026);
    expect(blocks).toHaveLength(2);
    expect(blocks[1].days.map((d) => d.date)).toEqual(['2026-04-01', '2026-04-02', '2026-04-03']);
    // Der erste Block darf seine TN-Zeile nicht mit der des zweiten überschreiben.
    expect(readMonthFromYearSheet(g, 2026, 3).get('PK01')).toHaveLength(2);
    expect(readMonthFromYearSheet(g, 2026, 4).get('PK01')).toHaveLength(3);
  });

  it('meldet Zeilen mit Namen aber ungültiger TN-ID, statt sie zu verschlucken', () => {
    const g = grid([
      HEADER,
      VN,
      ['', '', '2', 'Chmilenko', 'Maryna', 'U', 'U'],
    ]);
    const warnings: MalformedRow[] = [];
    parseYearSheetBlocks(g, 2026, warnings);
    expect(warnings).toEqual([
      { row: 3, rawId: '2', lastName: 'Chmilenko', weekStart: '2026-01-05' },
    ]);
  });

  it('filtert je Tag, nicht je Block, wenn eine Woche den Monat wechselt', () => {
    const g = grid([
      ['JANUAR', 'KW5', 'TN-ID', 'N', 'V',
        'M 26.01', '', 'D 27.01', '', 'M 28.01', '', 'D 29.01', '', 'F 30.01', ''],
      VN,
      ['', '', 'PK01', 'Al Helal', 'Safaa', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
    ]);
    expect(readMonthFromYearSheet(g, 2026, 1).get('PK01')).toHaveLength(5);
    expect(readMonthFromYearSheet(g, 2026, 2).get('PK01')).toBeUndefined();
  });
});

describe('Overall-Blatt', () => {
  const overallGrid = grid([
    ['Jahr', 'TN-ID', 'Nachname', 'Vorname', 'Januar', 'Februar'],
    ['2026', 'PK01', 'Al Helal', 'Safaa', '20', '0'],
    ['2026', 'PK24', 'Bockenauer', 'Maryam', '0', '18'],
  ]);

  it('behandelt 0 ohne Tagesdaten als „nicht erfasst", nicht als null Tage', () => {
    const feb = readOverallMonth(overallGrid, 2026, 2, () => false);
    expect(feb.get('PK01')).toMatchObject({ days: null, status: 'nicht_erfasst' });
  });

  it('akzeptiert 0 als echte Null, wenn Tagesdaten vorliegen', () => {
    const feb = readOverallMonth(overallGrid, 2026, 2, (id) => id === 'PK01');
    expect(feb.get('PK01')).toMatchObject({ days: 0, status: 'erfasst' });
  });

  it('meldet Abweichungen zwischen berechnet und gemeldet', () => {
    const jan = readOverallMonth(overallGrid, 2026, 1, () => true);
    const rows = crossCheckMonth(new Map([['PK01', 19], ['PK24', 0]]), jan);
    expect(rows.find((r) => r.tnId === 'PK01')).toMatchObject({
      computed: 19, reported: 20, agrees: false,
    });
    expect(rows.find((r) => r.tnId === 'PK24')?.agrees).toBe(true);
  });
});

describe('Übereinstimmung mit der Wochenformel der Liste', () => {
  // Die Liste zählt: COUNTIF(E) + COUNTIF(K) + COUNTIF(X) + COUNTIF("(x)") > 0
  it('zählt E/K/X/(x) als anwesend, A und U nicht', () => {
    const present: DayMarks[] = [
      { date: '2026-01-05', morning: 'E', afternoon: '' },
      { date: '2026-01-06', morning: 'K', afternoon: '' },
      { date: '2026-01-07', morning: 'X', afternoon: '' },
      { date: '2026-01-08', morning: '(x)', afternoon: '' },
    ];
    expect(present.every(isPresenceDay)).toBe(true);
    expect(isPresenceDay({ date: 'd', morning: 'A', afternoon: 'A' })).toBe(false);
    expect(isPresenceDay({ date: 'd', morning: 'U', afternoon: 'U' })).toBe(false);
    expect(countMonthPresence([present])).toBe(4);
  });
});
