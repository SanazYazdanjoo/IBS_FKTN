import { describe, expect, it } from 'vitest';
import {
  countMonthPresence,
  countWeekPresence,
  isPresenceDay,
  isReimbursableDay,
  isUnexcusedDay,
  summarizeAttendance,
} from '../attendance';
import { defaultRules } from '../rules';
import type { DayMarks } from '../types';

const day = (morning: DayMarks['morning'], afternoon: DayMarks['afternoon'], auReceived = false): DayMarks => ({
  date: '2026-07-01',
  morning,
  afternoon,
  auReceived,
});

describe('daily presence rule (Anwesenheitsberechnung §2)', () => {
  it('counts E, K, X, x and (x) as present', () => {
    for (const code of ['E', 'K', 'X', 'x', '(x)'] as const) {
      expect(isPresenceDay(day(code, ''))).toBe(true);
      expect(isPresenceDay(day('', code))).toBe(true);
    }
  });

  it('counts a day exactly ONCE even when both sessions are marked', () => {
    const both = day('X', 'X');
    expect(countWeekPresence([both])).toBe(1);
  });

  it('does not count empty or U days as present', () => {
    expect(isPresenceDay(day('', ''))).toBe(false);
    expect(isPresenceDay(day('U', ''))).toBe(false);
  });
});

describe('unexcused rule (Instruction §III)', () => {
  it('U is unexcused', () => {
    expect(isUnexcusedDay(day('U', ''))).toBe(true);
  });

  it('fully empty day is NOT unexcused — it is „noch nicht erfasst"', () => {
    // Wireframe-Spec Abschnitt 2: leer = offen. Verspaetete Listenpflege
    // darf dem/der TN keine unentschuldigten Fehltage erzeugen.
    expect(isUnexcusedDay(day('', ''))).toBe(false);
  });

  it('empty day WITH received AU is justified, not unexcused', () => {
    expect(isUnexcusedDay(day('', '', true))).toBe(false);
  });
});

describe('weekly and monthly aggregation (§3, §4)', () => {
  const fullWeek: DayMarks[] = [day('X', ''), day('', 'E'), day('K', 'K'), day('(x)', ''), day('x', 'x')];

  it('a full week caps at 5', () => {
    expect(countWeekPresence(fullWeek)).toBe(5);
  });

  it('monthly total is the sum of weekly totals', () => {
    const partial: DayMarks[] = [day('X', ''), day('', ''), day('U', ''), day('E', ''), day('', '')];
    expect(countMonthPresence([fullWeek, partial])).toBe(5 + 2);
  });
});

describe('reimbursable codes — RESOLVED by the Anwesenheitsliste legend', () => {
  const kulanzDay = day('K', '');

  it('default (legend): K (Kulanztag) IS reimbursable', () => {
    expect(isPresenceDay(kulanzDay)).toBe(true);
    expect(isReimbursableDay(kulanzDay, defaultRules)).toBe(true);
  });

  it('historical strict mode (flag=false) excludes K, for auditing old months', () => {
    const strict = { ...defaultRules, sickDaysAreReimbursable: false };
    expect(isReimbursableDay(kulanzDay, strict)).toBe(false);
  });

  it("'A' (abgemeldet) is a Fehltag but NOT unentschuldigt (legend rows 8/13)", () => {
    const aDay = day('A', 'A');
    expect(isPresenceDay(aDay)).toBe(false);
    expect(isReimbursableDay(aDay, defaultRules)).toBe(false);
    expect(isUnexcusedDay(aDay)).toBe(false);
  });

  it('summary under the legend default: K days count into reimbursable', () => {
    const days: DayMarks[] = [
      ...Array.from({ length: 19 }, () => day('X', '')),
      day('K', '', true),
      day('K', '', true),
      day('U', ''),
    ];
    const s = summarizeAttendance(days, defaultRules);
    expect(s.presenceDays).toBe(21);
    expect(s.reimbursableDays).toBe(21); // legend: E/K/X/(x) zählen
    expect(s.unexcusedDays).toBe(1);
    expect(s.auCoveredDays).toBe(2);
  });
});
