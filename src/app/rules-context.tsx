/**
 * Regel-Kontext: RuleConfig im Speicher, über Einstellungen änderbar. Wird
 * in localStorage gespiegelt (wie `auditLog.ts`), damit gepflegte Sätze
 * (D-Ticket-Preis, PKW-Satz, …) einen Seiten-Reload überstehen.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { defaultRules, type RuleConfig } from '../domain/rules';

const STORAGE_KEY = 'ibs-rules-v1';

function loadFromStorage(): RuleConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultRules;
    // Merge über die Defaults, damit neue RuleConfig-Felder aus einem
    // zukünftigen Release nicht fehlen, nur weil ein alter Stand im Speicher liegt.
    return { ...defaultRules, ...JSON.parse(raw) };
  } catch {
    return defaultRules;
  }
}

interface RulesContextValue {
  rules: RuleConfig;
  setRules: (rules: RuleConfig) => void;
  resetRules: () => void;
}

const RulesContext = createContext<RulesContextValue | null>(null);

export function RulesProvider({ children }: { children: ReactNode }) {
  const [rules, setRules] = useState<RuleConfig>(loadFromStorage);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
    } catch {
      // localStorage kann in seltenen Fällen nicht verfügbar sein (privater
      // Modus, Speicherlimit) — die Regeln bleiben dann nur für die laufende
      // Sitzung erhalten.
    }
  }, [rules]);

  const resetRules = () => setRules(defaultRules);

  return (
    <RulesContext.Provider value={{ rules, setRules, resetRules }}>
      {children}
    </RulesContext.Provider>
  );
}

export function useRules(): RulesContextValue {
  const ctx = useContext(RulesContext);
  if (!ctx) throw new Error('useRules must be used within RulesProvider');
  return ctx;
}
