/**
 * Fahrpreis-Kontext: VMT-Einzelfahrpreise im Speicher, zur Laufzeit änderbar
 * (P15). Gleicher Aufbau wie `rules-context.tsx`, inkl. localStorage-Spiegel
 * — ein Preis, der hier geändert wird, wirkt sich sofort auf jede Ansicht
 * aus, die über diesen Kontext liest (Vergleichsrechnung, TN-Detail), und
 * übersteht einen Seiten-Reload.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { VmtFareTable } from '../domain/vmtFares';
import { vmtFaresSeed } from '../adapters/mock/seed';

const STORAGE_KEY = 'ibs-vmt-fares-v1';

function loadFromStorage(): VmtFareTable {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return vmtFaresSeed;
    return { ...vmtFaresSeed, ...JSON.parse(raw) };
  } catch {
    return vmtFaresSeed;
  }
}

interface VmtFaresContextValue {
  fares: VmtFareTable;
  /**
   * Preis setzen/ändern; „Stand" wird auf jetzt gesetzt. `tariffZoneId`
   * (optional) verweist auf die offizielle VMT-Tarifzone (`vmtTariff.ts`),
   * falls der Preis von dort übernommen statt frei eingegeben wurde.
   */
  setFarePrice: (participantId: string, priceEur: number, tariffZoneId?: string) => void;
  resetFares: () => void;
}

const VmtFaresContext = createContext<VmtFaresContextValue | null>(null);

export function VmtFaresProvider({ children }: { children: ReactNode }) {
  const [fares, setFares] = useState<VmtFareTable>(loadFromStorage);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fares));
    } catch {
      // localStorage kann in seltenen Fällen nicht verfügbar sein — die
      // Preise bleiben dann nur für die laufende Sitzung erhalten.
    }
  }, [fares]);

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

  const resetFares = () => setFares(vmtFaresSeed);

  return (
    <VmtFaresContext.Provider value={{ fares, setFarePrice, resetFares }}>
      {children}
    </VmtFaresContext.Provider>
  );
}

export function useVmtFares(): VmtFaresContextValue {
  const ctx = useContext(VmtFaresContext);
  if (!ctx) throw new Error('useVmtFares must be used within VmtFaresProvider');
  return ctx;
}

