/**
 * Blatt „Overall": vorberechnete Monatssummen je TN.
 * Aufbau: A=Jahr, B=TN-ID, C=Nachname, D=Vorname, E..P = Januar..Dezember.
 *
 * Wichtig: eine 0 in diesem Blatt ist mehrdeutig. Sie bedeutet
 *   (a) tatsächlich null Anwesenheitstage,
 *   (b) Monat noch nicht erfasst (z. B. laufender Monat), oder
 *   (c) TN in diesem Monat noch nicht / nicht mehr im Kurs.
 * Wir geben deshalb nie blank „0 Tage" zurück, sondern einen Status. Sonst
 * würde die App für einen unausgefüllten Monat 0,00 € als Ergebnis anzeigen.
 */

export type OverallStatus = 'erfasst' | 'nicht_erfasst';

export interface OverallEntry {
  tnId: string;
  lastName: string;
  firstName: string;
  /** Anwesenheitstage laut Overall; null wenn nicht erfasst. */
  days: number | null;
  status: OverallStatus;
}

const COL_YEAR = 0;
const COL_TN_ID = 1;
const COL_LAST = 2;
const COL_FIRST = 3;
const COL_JANUAR = 4;

function cell(grid: string[][], row: number, col: number): string {
  return (grid[row]?.[col] ?? '').toString().trim();
}

/**
 * Liest die Monatsspalte des Overall-Blatts.
 * `hasDailyData` entscheidet, ob eine 0 als echte Null oder als „nicht
 * erfasst" gilt: nur wenn im Tagesblatt für diesen TN/Monat überhaupt
 * Markierungen stehen, ist 0 eine belastbare Aussage.
 */
export function readOverallMonth(
  grid: string[][],
  year: number,
  month: number,
  hasDailyData: (tnId: string) => boolean = () => false,
): Map<string, OverallEntry> {
  const out = new Map<string, OverallEntry>();
  const col = COL_JANUAR + (month - 1);

  for (let r = 1; r < grid.length; r += 1) {
    const tnId = cell(grid, r, COL_TN_ID).toUpperCase();
    if (!/^PK\d+$/.test(tnId)) continue;
    if (cell(grid, r, COL_YEAR) !== String(year)) continue;

    const raw = cell(grid, r, col);
    const parsed = raw === '' ? NaN : Number(raw.replace(',', '.'));
    const isZeroOrBlank = !Number.isFinite(parsed) || parsed === 0;
    const erfasst = !isZeroOrBlank || hasDailyData(tnId);

    out.set(tnId, {
      tnId,
      lastName: cell(grid, r, COL_LAST),
      firstName: cell(grid, r, COL_FIRST),
      days: erfasst ? (Number.isFinite(parsed) ? parsed : 0) : null,
      status: erfasst ? 'erfasst' : 'nicht_erfasst',
    });
  }
  return out;
}

export interface CrossCheckRow {
  tnId: string;
  /** Aus den Tagesmarkierungen berechnet. */
  computed: number;
  /** Aus dem Overall-Blatt gelesen; null = nicht erfasst. */
  reported: number | null;
  agrees: boolean;
}

/**
 * Vergleicht die selbst berechnete Monatssumme mit der im Overall-Blatt
 * hinterlegten. Es wird bewusst kein Wert automatisch bevorzugt — eine
 * Abweichung ist ein Hinweis auf eine veraltete Formel oder eine manuell
 * überschriebene Zelle und gehört einem Menschen vorgelegt.
 */
export function crossCheckMonth(
  computedByTn: Map<string, number>,
  overall: Map<string, OverallEntry>,
): CrossCheckRow[] {
  const ids = new Set([...computedByTn.keys(), ...overall.keys()]);
  return [...ids].sort().map((tnId) => {
    const computed = computedByTn.get(tnId) ?? 0;
    const entry = overall.get(tnId);
    const reported = entry?.days ?? null;
    return {
      tnId,
      computed,
      reported,
      agrees: reported === null ? true : reported === computed,
    };
  });
}
