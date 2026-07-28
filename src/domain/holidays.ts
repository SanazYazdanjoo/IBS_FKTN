/**
 * Feiertage und Arbeitstage (Thüringen).
 *
 * Grundlage für die Wireframes „Tab 1" (vollständig erfasst = weiß vs.
 * offene Halbtage = gelb) und „Kalenderblatt". Die Vollständigkeitsprüfung
 * lautet: anwesende Tage + Fehltage == Arbeitstage des Monats.
 *
 * Bewegliche Feiertage werden aus dem Osterdatum abgeleitet (Gauß/Butcher),
 * damit kein Jahr manuell gepflegt werden muss.
 *
 * Bewusst NICHT enthalten: Fronleichnam. Der Tag ist in Thüringen kein
 * landesweiter Feiertag, sondern gilt nur in bestimmten überwiegend
 * katholischen Gemeinden (Eichsfeld und Teile des Unstrut-Hainich- und
 * Wartburgkreises). Weimar gehört nicht dazu.
 */

export interface Holiday {
  /** ISO-Datum. */
  date: string;
  name: string;
}

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Ostersonntag nach dem Gauß-/Butcher-Algorithmus (gregorianisch). */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function shift(base: Date, days: number): string {
  const d = new Date(base.getTime() + days * 86_400_000);
  return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Gesetzliche Feiertage in Thüringen für ein Kalenderjahr. */
export function holidaysThuringia(year: number): Holiday[] {
  const easter = easterSunday(year);
  const list: Holiday[] = [
    { date: iso(year, 1, 1), name: 'Neujahr' },
    { date: shift(easter, -2), name: 'Karfreitag' },
    { date: shift(easter, 1), name: 'Ostermontag' },
    { date: iso(year, 5, 1), name: 'Tag der Arbeit' },
    { date: shift(easter, 39), name: 'Christi Himmelfahrt' },
    { date: shift(easter, 50), name: 'Pfingstmontag' },
    { date: iso(year, 10, 3), name: 'Tag der Deutschen Einheit' },
    { date: iso(year, 10, 31), name: 'Reformationstag' },
    { date: iso(year, 12, 25), name: '1. Weihnachtstag' },
    { date: iso(year, 12, 26), name: '2. Weihnachtstag' },
  ];
  // Weltkindertag ist in Thüringen seit 2019 gesetzlicher Feiertag.
  if (year >= 2019) list.push({ date: iso(year, 9, 20), name: 'Weltkindertag' });
  return list.sort((a, b) => a.date.localeCompare(b.date));
}

export function isWeekend(dateIso: string): boolean {
  const day = new Date(`${dateIso}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

export interface MonthCalendar {
  year: number;
  month: number;
  /** Mo–Fr ohne Feiertage. */
  workdays: number;
  holidays: Holiday[];
  /** ISO-Daten aller Arbeitstage, in Reihenfolge. */
  workdayDates: string[];
}

export function monthCalendar(year: number, month: number): MonthCalendar {
  const all = holidaysThuringia(year);
  const inMonth = all.filter((h) => h.date.startsWith(`${year}-${String(month).padStart(2, '0')}-`));
  const holidayDates = new Set(inMonth.map((h) => h.date));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const workdayDates: string[] = [];
  for (let d = 1; d <= daysInMonth; d += 1) {
    const date = iso(year, month, d);
    if (isWeekend(date) || holidayDates.has(date)) continue;
    workdayDates.push(date);
  }

  // Feiertage, die auf ein Wochenende fallen, reduzieren die Arbeitstage
  // nicht und werden für die Anzeige trotzdem genannt.
  return { year, month, workdays: workdayDates.length, holidays: inMonth, workdayDates };
}

export type MonthCompleteness = 'vollstaendig' | 'offen' | 'nicht_erfasst';

export interface MonthStatus {
  completeness: MonthCompleteness;
  presentDays: number;
  absentDays: number;
  workdays: number;
  /** Arbeitstage ohne jede Eintragung. */
  openDays: number;
}

/**
 * Ampel für die Jahresübersicht (Wireframe 1a).
 *
 * „vollständig" (weiß) heißt: für jeden Arbeitstag liegt eine Eintragung
 * vor, also anwesend + Fehltage == Arbeitstage. Sobald ein Arbeitstag ohne
 * Eintrag existiert, ist der Monat „offen" (gelb).
 *
 * Achtung: die Arbeitstage stammen aus dem Kalender, die Eintragungen aus
 * der Liste. Deckt die Liste einen Monat nur teilweise ab (Kursbeginn oder
 * -ende mitten im Monat), erscheint der Monat zu Recht als offen — das ist
 * ein Hinweis auf fehlende Zeilen, keine Falschmeldung.
 */
export function monthStatus(
  presentDays: number,
  absentDays: number,
  cal: MonthCalendar,
): MonthStatus {
  const recorded = presentDays + absentDays;
  const openDays = Math.max(0, cal.workdays - recorded);
  const completeness: MonthCompleteness =
    recorded === 0 ? 'nicht_erfasst' : openDays === 0 ? 'vollstaendig' : 'offen';
  return {
    completeness,
    presentDays,
    absentDays,
    workdays: cal.workdays,
    openDays,
  };
}
