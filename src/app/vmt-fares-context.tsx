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

/**
 * Verdict-Zeile: A gegen B in einer Zeile, Gewinner markiert. Die
 * FormulaBoxen darunter zeigen weiterhin die Herleitung — hier steht nur
 * das Ergebnis des Vergleichs, damit es nicht aus einem Label gelesen
 * werden muss.
 */
function ComparisonVerdict({
  proRataEur,
  vmtEur,
  method,
}: {
  proRataEur: number;
  vmtEur: number;
  method: 'PRO_RATA' | 'VMT_SINGLE_FARES';
}) {
  const rows = [
    { id: 'A', label: 'A · Anteiliges Abo', amountEur: proRataEur, wins: method === 'PRO_RATA' },
    { id: 'B', label: 'B · VMT-Einzelfahrten', amountEur: vmtEur, wins: method === 'VMT_SINGLE_FARES' },
  ].sort((x, y) => x.amountEur - y.amountEur);

  return (
    <table className="min-w-full text-left text-sm">
      <caption className="sr-only">Vergleich A gegen B, günstigste Variante zuerst</caption>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className={`border-b border-line/60 last:border-0 ${r.wins ? 'font-semibold' : 'text-ink-dim'}`}>
            <td className="py-2 pr-3">
              {r.label}
              {r.wins && <span className="ml-2 text-primary">✓ günstiger — wird erstattet</span>}
            </td>
            <td className="py-2 pr-3 text-right">{formatEuro(r.amountEur)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}