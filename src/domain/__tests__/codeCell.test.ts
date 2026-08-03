import { describe, expect, it } from 'vitest';
import { cellFill, CODE_MEANING, CODES } from '../../features/dozent/CodeCell';

describe('Zellfarben (Spezifikation Abschnitt 6)', () => {
  it('grau für Feiertag und Wochenende, unabhängig vom Code', () => {
    expect(cellFill('', true)).toContain('--muted');
    expect(cellFill('X', true)).toContain('--muted');
  });

  it('gelb für leer — noch einzutragen', () => {
    expect(cellFill('', false)).toContain('--highlight-weak');
  });

  it('grau für Wochenende ohne Eintrag, aber nicht gesperrt', () => {
    expect(cellFill('', false, true)).toContain('--muted');
  });

  it('gelb für A — muss nochmal geprüft werden', () => {
    expect(cellFill('A', false)).toContain('--highlight)');
  });

  it('rot für Fehltag U', () => {
    expect(cellFill('U', false)).toContain('--danger');
  });

  it('weiß für anwesende Codes', () => {
    for (const code of ['X', '(x)', 'E', 'K'] as const) {
      expect(cellFill(code, false)).toContain('--surface');
    }
  });
});

describe('Codeliste', () => {
  it('bietet genau die sechs Codes der Spezifikation', () => {
    expect(CODES).toEqual(['X', '(x)', 'E', 'K', 'A', 'U']);
  });

  it('beschreibt jeden Code', () => {
    for (const c of CODES) expect(CODE_MEANING[c]).toBeTruthy();
  });
});
