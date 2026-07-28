import { describe, expect, it } from 'vitest';
import {
  easterSunday, holidaysThuringia, monthCalendar, monthStatus,
} from '../holidays';

const isoOf = (d: Date) => d.toISOString().slice(0, 10);

describe('Osterdatum', () => {
  it('trifft bekannte Jahre', () => {
    expect(isoOf(easterSunday(2025))).toBe('2025-04-20');
    expect(isoOf(easterSunday(2026))).toBe('2026-04-05');
    expect(isoOf(easterSunday(2027))).toBe('2027-03-28');
  });
});

describe('Feiertage Thüringen', () => {
  const h2026 = holidaysThuringia(2026);
  const on = (d: string) => h2026.find((x) => x.date === d)?.name;

  it('leitet die beweglichen Feiertage aus Ostern ab', () => {
    expect(on('2026-04-03')).toBe('Karfreitag');
    expect(on('2026-04-06')).toBe('Ostermontag');
    expect(on('2026-05-14')).toBe('Christi Himmelfahrt');
    expect(on('2026-05-25')).toBe('Pfingstmontag');
  });

  it('enthält Weltkindertag und Reformationstag', () => {
    expect(on('2026-09-20')).toBe('Weltkindertag');
    expect(on('2026-10-31')).toBe('Reformationstag');
  });

  it('enthält Fronleichnam nicht (in Weimar kein Feiertag)', () => {
    expect(h2026.some((x) => x.name === 'Fronleichnam')).toBe(false);
  });

  it('kennt Weltkindertag vor 2019 nicht', () => {
    expect(holidaysThuringia(2018).some((x) => x.name === 'Weltkindertag')).toBe(false);
  });
});

describe('Arbeitstage', () => {
  // Gegengeprüft an den Werten, die für die Abrechnung 2026 verwendet wurden.
  it('zählt Februar und März 2026 korrekt', () => {
    expect(monthCalendar(2026, 2).workdays).toBe(20);
    expect(monthCalendar(2026, 3).workdays).toBe(22);
  });

  it('zieht Karfreitag und Ostermontag von April 2026 ab', () => {
    const april = monthCalendar(2026, 4);
    expect(april.workdays).toBe(20); // 22 Wochentage − 2 Feiertage
    expect(april.holidays.map((h) => h.name)).toEqual(['Karfreitag', 'Ostermontag']);
  });

  it('zieht Neujahr von Januar 2026 ab', () => {
    expect(monthCalendar(2026, 1).workdays).toBe(21);
  });
});

describe('Monatsampel', () => {
  const feb = monthCalendar(2026, 2); // 20 Arbeitstage

  it('weiß, sobald jeder Arbeitstag erfasst ist', () => {
    expect(monthStatus(18, 2, feb).completeness).toBe('vollstaendig');
  });

  it('gelb, solange Arbeitstage ohne Eintrag bleiben', () => {
    const s = monthStatus(15, 2, feb);
    expect(s.completeness).toBe('offen');
    expect(s.openDays).toBe(3);
  });

  it('unterscheidet „gar nicht erfasst" von „null Tage anwesend"', () => {
    expect(monthStatus(0, 0, feb).completeness).toBe('nicht_erfasst');
    expect(monthStatus(0, 20, feb).completeness).toBe('vollstaendig');
  });
});
