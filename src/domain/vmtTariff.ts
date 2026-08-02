/**
 * Offizielle VMT-Einzelfahrpreise, Stand 01.08.2025 (VMT-Preisübersicht).
 * Nur die "Einzelfahrt"-Zeile (Erwachsene, ohne BahnCard) ist hier erfasst —
 * die einzige Ticketart, die in die Vergleichsrechnung eingeht (B, §I).
 * Quelle: VMT-Preisübersicht, gültig ab 01.08.2025 (Preisstufe A = City-/
 * RegioTarif-Grundstufe, D = CityRegioTarif, C = RegioTarif).
 *
 * Dient als Auswahlgrundlage in der Fahrpreis-Tabelle (Vergleichsrechnung):
 * eine Admin wählt die zutreffende Tarifzone statt einen Preis frei zu
 * tippen. Für Sonderfälle (z. B. "VMT Gesamtnetz"-Vertrag), die sich nicht
 * auf eine Preisstufe abbilden lassen, bleibt die manuelle Eingabe möglich —
 * es wird nichts geraten, welche Zone zutrifft.
 */

export const VMT_TARIFF_STAND = '2025-08-01';

export interface VmtTariffZone {
  id: string;
  /** Anzeigename inkl. Tarifart, z. B. "CityTarif Erfurt". */
  label: string;
  einzelfahrtEur: number;
}

/** CityTarif — Einzelfahrt, je Stadt (Preisstufe 1 der jeweiligen CityZone). */
const CITY_TARIF: VmtTariffZone[] = [
  { id: 'city-erfurt', label: 'CityTarif Erfurt', einzelfahrtEur: 2.9 },
  { id: 'city-weimar', label: 'CityTarif Weimar', einzelfahrtEur: 2.9 },
  { id: 'city-jena', label: 'CityTarif Jena', einzelfahrtEur: 2.9 },
  { id: 'city-gera', label: 'CityTarif Gera', einzelfahrtEur: 2.9 },
];

/** CityRegioTarif — Einzelfahrt, Preisstufe 2–11 (verbindet City- und RegioZonen). */
const CITY_REGIO_TARIF: VmtTariffZone[] = [
  { id: 'cityregio-2', label: 'CityRegioTarif Preisstufe 2', einzelfahrtEur: 4.0 },
  { id: 'cityregio-3', label: 'CityRegioTarif Preisstufe 3', einzelfahrtEur: 5.8 },
  { id: 'cityregio-4', label: 'CityRegioTarif Preisstufe 4', einzelfahrtEur: 8.1 },
  { id: 'cityregio-5', label: 'CityRegioTarif Preisstufe 5', einzelfahrtEur: 9.0 },
  { id: 'cityregio-6', label: 'CityRegioTarif Preisstufe 6', einzelfahrtEur: 11.4 },
  { id: 'cityregio-7', label: 'CityRegioTarif Preisstufe 7', einzelfahrtEur: 14.5 },
  { id: 'cityregio-8', label: 'CityRegioTarif Preisstufe 8', einzelfahrtEur: 16.5 },
  { id: 'cityregio-9', label: 'CityRegioTarif Preisstufe 9', einzelfahrtEur: 18.6 },
  { id: 'cityregio-10', label: 'CityRegioTarif Preisstufe 10', einzelfahrtEur: 20.3 },
  { id: 'cityregio-11', label: 'CityRegioTarif Preisstufe 11', einzelfahrtEur: 22.4 },
];

/** RegioTarif — Einzelfahrt, Preisstufe 1–11 sowie Verbundweit. */
const REGIO_TARIF: VmtTariffZone[] = [
  { id: 'regio-1', label: 'RegioTarif Preisstufe 1', einzelfahrtEur: 2.2 },
  { id: 'regio-2', label: 'RegioTarif Preisstufe 2', einzelfahrtEur: 2.9 },
  { id: 'regio-3', label: 'RegioTarif Preisstufe 3', einzelfahrtEur: 5.2 },
  { id: 'regio-4', label: 'RegioTarif Preisstufe 4', einzelfahrtEur: 6.8 },
  { id: 'regio-5', label: 'RegioTarif Preisstufe 5', einzelfahrtEur: 8.7 },
  { id: 'regio-6', label: 'RegioTarif Preisstufe 6', einzelfahrtEur: 10.6 },
  { id: 'regio-7', label: 'RegioTarif Preisstufe 7', einzelfahrtEur: 12.7 },
  { id: 'regio-8', label: 'RegioTarif Preisstufe 8', einzelfahrtEur: 14.5 },
  { id: 'regio-9', label: 'RegioTarif Preisstufe 9', einzelfahrtEur: 16.2 },
  { id: 'regio-10', label: 'RegioTarif Preisstufe 10', einzelfahrtEur: 17.7 },
  { id: 'regio-11', label: 'RegioTarif Preisstufe 11', einzelfahrtEur: 19.5 },
  { id: 'regio-verbundweit', label: 'RegioTarif Verbundweit', einzelfahrtEur: 25.7 },
];

/** Alle Tarifzonen, in Anzeigereihenfolge (City → CityRegio → Regio). */
export const VMT_TARIFF_ZONES: readonly VmtTariffZone[] = [
  ...CITY_TARIF,
  ...CITY_REGIO_TARIF,
  ...REGIO_TARIF,
];

/** Für die Auswahl gruppiert (z. B. `<optgroup>`), gleiche Reihenfolge. */
export const VMT_TARIFF_GROUPS: readonly { label: string; zones: VmtTariffZone[] }[] = [
  { label: 'CityTarif', zones: CITY_TARIF },
  { label: 'CityRegioTarif', zones: CITY_REGIO_TARIF },
  { label: 'RegioTarif', zones: REGIO_TARIF },
];

export function findTariffZone(id: string): VmtTariffZone | undefined {
  return VMT_TARIFF_ZONES.find((z) => z.id === id);
}
