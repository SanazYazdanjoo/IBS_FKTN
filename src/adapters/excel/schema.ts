/**
 * Spalten-Auflösung über Kopfzeilen (nicht Positionen), mit Alias-Listen
 * für historische Umbenennungen und einem Wertemuster-Fallback für TN_ID.
 * Fehlen Pflichtspalten, wird das Schreiben verweigert.
 */

export function normalizeHeader(h: unknown): string {
  return String(h ?? '')
    .toLowerCase()
    .replace(/[_\-?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface ColumnSpec {
  key: string;
  aliases: string[]; // normalized forms
  required: boolean;
}

export const MASTER_COLUMNS: ColumnSpec[] = [
  { key: 'tnId', aliases: ['tn id'], required: true },
  { key: 'nachname', aliases: ['nachname'], required: true },
  { key: 'vorname', aliases: ['vorname'], required: true },
  { key: 'berechnung', aliases: ['berechnung'], required: false },
  { key: 'strasse', aliases: ['strasse', 'straße'], required: false },
  { key: 'hausnr', aliases: ['hausnr', 'hausnr.'], required: false },
  { key: 'plz', aliases: ['plz'], required: false },
  { key: 'ort', aliases: ['ort'], required: false },
  { key: 'fahrtroute', aliases: ['fahrtroute'], required: false },
  { key: 'entfernungKm', aliases: ['entfernung km'], required: false },
  { key: 'verkehrsmittel', aliases: ['verkehrsmittel', 'pkw oder öpnv', 'pkw oder opnv'], required: false },
  { key: 'kennzeichen', aliases: ['bei pkw kennzeichen', 'kennzeichen'], required: false },
  { key: 'ticketart', aliases: ['ticketart'], required: false },
  { key: 'vmtZone', aliases: ['vmt zone'], required: false },
  { key: 'kontoinhaber', aliases: ['kontoinhaber'], required: false },
  { key: 'iban', aliases: ['iban'], required: false },
  { key: 'bank', aliases: ['bank'], required: false },
  { key: 'bic', aliases: ['bic'], required: false },
  { key: 'cloud', aliases: ['cloud'], required: false },
  { key: 'email', aliases: ['email', 'e-mail'], required: false },
  { key: 'ticket', aliases: ['ticket'], required: false },
  { key: 'aboNummer', aliases: ['abo nummer', 'abonummer'], required: false },
  { key: 'bemerkungen', aliases: ['bemerkungen'], required: false },
  { key: 'lastUpdate', aliases: ['last update'], required: false },
];

export const UEBERSICHT_COLUMNS: ColumnSpec[] = [
  { key: 'tnId', aliases: ['tn id'], required: true },
  { key: 'nachname', aliases: ['nachname'], required: true },
  { key: 'vorname', aliases: ['vorname'], required: true },
  { key: 'monat', aliases: ['monat'], required: true },
  { key: 'jahr', aliases: ['jahr'], required: true },
  { key: 'arbeitstage', aliases: ['arbeitstage'], required: true },
  { key: 'lastChecked', aliases: ['last checked', 'last update'], required: false },
  { key: 'zustand', aliases: ['zustand'], required: true },
  { key: 'art', aliases: ['art', 'pkw oder öpnv', 'pkw oder opnv', 'verkehrsmittel'], required: false },
  { key: 'ticketart', aliases: ['ticketart'], required: false },
  { key: 'bild', aliases: ['bild'], required: false },
  { key: 'rechnung', aliases: ['rechnung'], required: false },
  { key: 'kontoauszug', aliases: ['kontoauszug'], required: false },
  { key: 'praktikumsvertrag', aliases: ['praktikumsvertrag'], required: false },
  { key: 'mehrAls3km', aliases: ['mehr als 3km', 'mehr als 3 km'], required: false },
  { key: 'sozialDTicket', aliases: ['sozial d ticket', 'sozialticket'], required: false },
  { key: 'anwesenheitstage', aliases: ['anwesenheitstage'], required: true },
  { key: 'betrag', aliases: ['betrag'], required: true },
  { key: 'tnUnterschrift', aliases: ['tn unterschrift'], required: false },
  { key: 'bemerkung', aliases: ['bemerkung', 'bemerkungen'], required: false },
];

export const TN_ID_PATTERN = /^(PK|BL)\s*\d+/i;

export interface ResolvedSchema {
  /** canonical key → 0-based column index */
  columns: Map<string, number>;
  missingRequired: string[];
  unknownHeaders: string[];
  ok: boolean;
}

/**
 * Resolve columns from a header row; sampleRows are used for the
 * TN_ID value-pattern fallback when the header is broken.
 */
export function resolveSchema(
  specs: ColumnSpec[],
  headerRow: unknown[],
  sampleRows: unknown[][] = [],
): ResolvedSchema {
  const columns = new Map<string, number>();
  const claimed = new Set<number>();
  const normalized = headerRow.map(normalizeHeader);

  for (const spec of specs) {
    const idx = normalized.findIndex((h, i) => !claimed.has(i) && spec.aliases.includes(h));
    if (idx >= 0) {
      columns.set(spec.key, idx);
      claimed.add(idx);
    }
  }

  // TN_ID-Fallback über das Wertemuster PK…/BL…
  if (!columns.has('tnId') && sampleRows.length > 0) {
    const width = Math.max(...sampleRows.map((r) => r.length), headerRow.length);
    for (let col = 0; col < width; col += 1) {
      if (claimed.has(col)) continue;
      const values = sampleRows
        .map((r) => String(r[col] ?? '').trim())
        .filter((v) => v.length > 0);
      if (values.length > 0 && values.every((v) => TN_ID_PATTERN.test(v))) {
        columns.set('tnId', col);
        claimed.add(col);
        break;
      }
    }
  }

  const missingRequired = specs
    .filter((s) => s.required && !columns.has(s.key))
    .map((s) => s.key);
  const known = new Set(specs.flatMap((s) => s.aliases));
  const unknownHeaders = normalized.filter((h, i) => h.length > 0 && !claimed.has(i) && !known.has(h));

  return { columns, missingRequired, unknownHeaders, ok: missingRequired.length === 0 };
}

/** Blatt-Typ anhand der Kopfzeilen bestimmen. */
export function classifySheet(headerRow: unknown[]): 'MASTER' | 'UEBERSICHT' | 'UNKNOWN' {
  const normalized = headerRow.map(normalizeHeader);
  const has = (alias: string) => normalized.includes(alias);
  if (has('monat') && has('jahr') && has('betrag')) return 'UEBERSICHT';
  if (has('tn id') && has('nachname') && has('vorname')) return 'MASTER';
  return 'UNKNOWN';
}
