/**
 * Fahrpreis-Kontext: VMT-Einzelfahrpreise im Speicher, zur Laufzeit änderbar
 * (P15). Gleicher Aufbau wie `rules-context.tsx` — kein Backend, kein
 * localStorage; ein Preis, der hier geändert wird, wirkt sich sofort auf jede
 * Ansicht aus, die über diesen Kontext liest (Vergleichsrechnung, TN-Detail).
 */
import { createContext, useContext, useState, type ReactNode } from 'react';
import type { VmtFareTable } from '../domain/vmtFares';
import { vmtFaresSeed } from '../adapters/mock/seed';

interface VmtFaresContextValue {
  fares: VmtFareTable;
  /**
   * Preis setzen/ändern; „Stand" wird auf jetzt gesetzt. `tariffZoneId`
   * (optional) verweist auf die offizielle VMT-Tarifzone (`vmtTariff.ts`),
   * falls der Preis von dort übernommen statt frei eingegeben wurde.
   */
  setFarePrice: (participantId: string, priceEur: number, tariffZoneId?: string) => void;
}

const VmtFaresContext = createContext<VmtFaresContextValue | null>(null);

export function VmtFaresProvider({ children }: { children: ReactNode }) {
  const [fares, setFares] = useState<VmtFareTable>(vmtFaresSeed);

  const setFarePrice = (participantId: string, priceEur: number, tariffZoneId?: string) => {
    const id = participantId.toUpperCase();
    setFares((prev) => ({
      ...prev,
      [id]: {
        participantId: id,
        priceEur,
        updatedAt: new Date().toISOString().slice(0, 10),
        tariffZoneId,
      },
    }));
  };

  return (
    <VmtFaresContext.Provider value={{ fares, setFarePrice }}>{children}</VmtFaresContext.Provider>
  );
}

export function useVmtFares(): VmtFaresContextValue {
  const ctx = useContext(VmtFaresContext);
  if (!ctx) throw new Error('useVmtFares must be used within VmtFaresProvider');
  return ctx;
}

