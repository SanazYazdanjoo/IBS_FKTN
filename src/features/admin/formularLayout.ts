/**
 * Positionierungs-Hilfen für die pixelgetreue Formular-Vorschau.
 * Alle Koordinaten stammen aus der echten Vorlage
 * (Template_FHKT_Abrechnung_xlsx_-_Tabelle1.pdf), gemessen per
 * pdfplumber (Wort- und Rechteck-Boxen in PDF-Punkten, Ursprung oben
 * links wie im PDF). So bleibt die Vorschau layoutgetreu, auch wenn
 * sich Textinhalte ändern.
 */

/** PDF-Punkte → Millimeter (1pt = 1/72 Zoll = 0,352778 mm). */
export const PT2MM = 0.352778;

/** Seitenmaß der Vorlage: A4 Hochformat, 595 × 842 pt. */
export const PAGE_W_PT = 595;
export const PAGE_H_PT = 842;

export const mm = (pt: number): string => `${(pt * PT2MM).toFixed(2)}mm`;

/** Abstand von der rechten Seitenkante bis zu einer x-Koordinate (für rechtsbündige Beträge). */
export const mmFromRight = (xPt: number): string => mm(PAGE_W_PT - xPt);
