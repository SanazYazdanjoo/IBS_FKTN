/**
 * Rules context — RuleConfig held in memory for the prototype (Admin
 * settings screen, 5a). Persist this via the StorageAdapter once the
 * backend exists; screens don't need to change.
 */
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
