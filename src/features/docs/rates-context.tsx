/**
 * A global context for managing all financial rates and fares used in
 * reimbursement calculations. This includes VMT fares, the Deutschlandticket
 * price, and PKW reimbursement rates.
 *
 * It persists all data to localStorage, allowing for dynamic updates across
 * the application without a page reload. It also provides a mechanism to
 * reset all rates to their default values.
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { VmtFare, vmtFaresSeed } from '../domain/vmtFares';
import { ruleConfigDefault } from '../domain/rules';

export { VmtFareTable } from '../features/admin/VmtFareTable';

export type Rates = {
  vmtFares: VmtFare[];
  deutschlandTicketPriceEur: number;
  pkwRateEurPerKm: number;
};

const defaultRates: Rates = {
  vmtFares: vmtFaresSeed,
  deutschlandTicketPriceEur: ruleConfigDefault.deutschlandTicketPriceEur,
  pkwRateEurPerKm: ruleConfigDefault.pkwRateEurPerKm,
};

const RATES_STORAGE_KEY = 'app-rates-config';

type RatesContextType = {
  rates: Rates;
  setVmtFares: (fares: VmtFare[]) => void;
  setDeutschlandticketPrice: (price: number) => void;
  setPkwRate: (rate: number) => void;
  resetRates: () => void;
};

const RatesContext = createContext<RatesContextType | undefined>(undefined);

export function RatesProvider({ children }: { children: ReactNode }) {
  const [rates, setRates] = useState<Rates>(() => {
    try {
      const storedRates = localStorage.getItem(RATES_STORAGE_KEY);
      if (storedRates) {
        const parsed = JSON.parse(storedRates);
        // Basic validation to ensure stored data has the expected shape
        if (
          'vmtFares' in parsed &&
          'deutschlandTicketPriceEur' in parsed &&
          'pkwRateEurPerKm' in parsed
        ) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Failed to load rates from localStorage', error);
    }
    return defaultRates;
  });

  useEffect(() => {
    try {
      localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(rates));
    } catch (error) {
      console.error('Failed to save rates to localStorage', error);
    }
  }, [rates]);

  const setVmtFares = useCallback((fares: VmtFare[]) => {
    setRates((prev) => ({ ...prev, vmtFares: fares }));
  }, []);

  const setDeutschlandticketPrice = useCallback((price: number) => {
    setRates((prev) => ({ ...prev, deutschlandTicketPriceEur: price }));
  }, []);

  const setPkwRate = useCallback((rate: number) => {
    setRates((prev) => ({ ...prev, pkwRateEurPerKm: rate }));
  }, []);

  const resetRates = useCallback(() => {
    setRates(defaultRates);
  }, []);

  const value = {
    rates,
    setVmtFares,
    setDeutschlandticketPrice,
    setPkwRate,
    resetRates,
  };

  return (
    <RatesContext.Provider value={value}>{children}</RatesContext.Provider>
  );
}

export function useRates() {
  const context = useContext(RatesContext);
  if (context === undefined) {
    throw new Error('useRates must be used within a RatesProvider');
  }
  return context;
}