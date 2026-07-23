/** Regel-Kontext: RuleConfig im Speicher, über Einstellungen änderbar. */
import { createContext, useContext, useState, type ReactNode } from 'react';
import { defaultRules, type RuleConfig } from '../domain/rules';

interface RulesContextValue {
  rules: RuleConfig;
  setRules: (rules: RuleConfig) => void;
}

const RulesContext = createContext<RulesContextValue | null>(null);

export function RulesProvider({ children }: { children: ReactNode }) {
  const [rules, setRules] = useState<RuleConfig>(defaultRules);
  return (
    <RulesContext.Provider value={{ rules, setRules }}>{children}</RulesContext.Provider>
  );
}

export function useRules(): RulesContextValue {
  const ctx = useContext(RulesContext);
  if (!ctx) throw new Error('useRules must be used within RulesProvider');
  return ctx;
}
