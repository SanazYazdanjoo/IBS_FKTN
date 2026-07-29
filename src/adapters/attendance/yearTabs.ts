/**
 * Jahresblätter erkennen.
 *
 * Die Liste bekommt je Kalenderjahr ein eigenes Blatt („2025", „2026", …).
 * Der Träger legt neue Jahre selbst an, deshalb wird das Jahr aus den
 * vorhandenen Blattnamen ermittelt und nicht konfiguriert. Ein neues Blatt
 * „2027" taucht damit ohne Codeänderung und ohne Einstellung auf.
 *
 * Zugleich ist das Blatt die einzige Quelle für das Jahr: der Parser bildet
 * die Datumsangaben aus Tageskopf („M 5.01") und Jahr. Stammten Jahr und
 * Blattname aus verschiedenen Feldern, ließen sich Daten stillschweigend
 * um ein Jahr verschieben.
 */

/** Blattnamen, die kein Jahr sind und übersprungen werden. */
const NON_YEAR_TABS = ['regeln', 'overall', 'legende', 'kalender', 'stammdaten'];

/**
 * Jahr aus einem Blattnamen, oder null.
 * Akzeptiert „2026" sowie gängige Varianten wie „2026 " oder „Jahr 2026".
 */
export function parseYearTabName(name: string): number | null {
  const trimmed = name.trim();
  if (NON_YEAR_TABS.includes(trimmed.toLowerCase())) return null;

  const match = /(^|\D)(20\d{2})(\D|$)/.exec(trimmed);
  if (!match) return null;

  const year = Number(match[2]);
  // Plausibilitätsgrenzen: verhindert, dass eine Jahreszahl aus einem
  // beliebigen anderen Blattnamen („Archiv 2019-2024") als Jahresblatt gilt.
  if (year < 2000 || year > 2100) return null;
  // Mehrere Jahreszahlen im Namen sind mehrdeutig → kein Jahresblatt.
  if (/(20\d{2})\D+(20\d{2})/.test(trimmed)) return null;

  return year;
}

export interface YearTab {
  /** Blattname, exakt wie in der Datei. */
  name: string;
  year: number;
}

/** Alle Jahresblätter, aufsteigend nach Jahr. */
export function discoverYearTabs(sheetNames: string[]): YearTab[] {
  const found: YearTab[] = [];
  for (const name of sheetNames) {
    const year = parseYearTabName(name);
    if (year !== null) found.push({ name, year });
  }
  return found.sort((a, b) => a.year - b.year);
}

/** Blatt mit den Monatssummen, unabhängig von Groß-/Kleinschreibung. */
export function findOverallTab(sheetNames: string[]): string | null {
  return sheetNames.find((n) => n.trim().toLowerCase() === 'overall') ?? null;
}

/**
 * Das Jahresblatt, das am besten zu einem gewünschten Jahr passt:
 * exakt, sonst das jüngste davorliegende, sonst das älteste vorhandene.
 * So bleibt die App bedienbar, auch wenn das laufende Jahr noch fehlt.
 */
export function pickYearTab(tabs: YearTab[], preferred: number): YearTab | null {
  if (tabs.length === 0) return null;
  const exact = tabs.find((t) => t.year === preferred);
  if (exact) return exact;
  const earlier = tabs.filter((t) => t.year < preferred);
  if (earlier.length > 0) return earlier[earlier.length - 1];
  return tabs[0];
}
