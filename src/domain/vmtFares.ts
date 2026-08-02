/**
 * VMT-Einzelfahrpreis-Tabelle (P15). Ersetzt den früheren Einzelfall-Blick
 * ("was kostet eine Einzelfahrt für diese eine Person gerade") durch eine
 * gepflegte, adressierbare Tabelle je TN — inkl. Stand (letzte Änderung),
 * damit eine Admin einer Zahl vertrauen kann, ohne sie neu zu recherchieren.
 */

export interface VmtFareRecord {
  participantId: string;
  priceEur: number;
  /** ISO-Datum der letzten Änderung ("Stand"). */
  updatedAt: string;
}

export type VmtFareTable = Record<string, VmtFareRecord>;

/** Reine Preis-Lookup-Tabelle für die Erstattungs-Engine (ohne Metadaten). */
export function toFareLookup(table: VmtFareTable): Record<string, number> {
  const lookup: Record<string, number> = {};
  for (const [id, entry] of Object.entries(table)) {
    lookup[id] = entry.priceEur;
  }
  return lookup;
}

/**
 * Parst eine Preiseingabe (deutsches Komma erlaubt, z. B. "2,40") zu einer
 * validen Zahl. Erlaubt: positiv, maximal 2 Nachkommastellen. Ungültige oder
 * leere Eingaben liefern null — es wird nichts geraten.
 */
export function parseGermanDecimal(input: string): number | null {
  const normalized = input.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}
