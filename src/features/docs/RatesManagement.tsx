/**
 * A unified management page for all financial rates and fares used in
 * reimbursement calculations. This provides a single source of truth for
 * administrators to view and update:
 * - VMT (Verkehrsverbund Mittelthüringen) single fares for comparison calculations.
 * - The monthly price of the Deutschlandticket (D-Ticket).
 * - Per-kilometer reimbursement rates for private car (PKW) usage.
 *
 * All values are persisted to localStorage and instantly propagated throughout the
 * application via the `RatesContext`.
 */
import { useState } from 'react';
import { Card, Page, PrimaryButton, SecondaryButton } from '../../app/ui';
import { useRates, VmtFareTable } from '../../app/rates-context';
import { RuleConfig, ruleConfigDefault } from '../../domain/rules';

type Tab = 'vmt' | 'dticket' | 'pkw';

function VmtFaresManager() {
  const { rates, setVmtFares } = useRates();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-ink">VMT Single Fares</h3>
      <p className="text-sm text-ink-dim">
        These are the zone-based single fares used for the public transport
        comparison calculation (Vergleichsrechnung).
      </p>
      <VmtFareTable fares={rates.vmtFares} onFaresChange={setVmtFares} />
    </div>
  );
}

function DticketManager() {
  const { rates, setDeutschlandticketPrice } = useRates();
  const [price, setPrice] = useState(rates.deutschlandTicketPriceEur);

  const handleSave = () => {
    setDeutschlandticketPrice(price);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-ink">Deutschlandticket (D-Ticket)</h3>
      <p className="text-sm text-ink-dim">
        The official monthly price of the Deutschlandticket, used as a cap for
        public transport reimbursements.
      </p>
      <div className="flex items-center gap-3">
        <label htmlFor="dticket-price" className="font-medium text-sm">
          Monthly Price (€)
        </label>
        <input
          id="dticket-price"
          type="number"
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          className="w-32 rounded-md border border-stroke bg-surface px-3 py-1.5 text-sm focus:border-primary focus:ring-primary/40"
        />
        <PrimaryButton
          onClick={handleSave}
          disabled={price === rates.deutschlandTicketPriceEur}
          logId="rates.save-dticket"
        >
          Save
        </PrimaryButton>
      </div>
    </div>
  );
}

function PkwRateManager() {
  const { rates, setPkwRate } = useRates();
  const [rate, setRate] = useState(rates.pkwRateEurPerKm);

  const handleSave = () => {
    setPkwRate(rate);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-ink">PKW Reimbursement Rate</h3>
      <p className="text-sm text-ink-dim">
        The per-kilometer reimbursement rate for participants using a private car
        (PKW).
      </p>
      <div className="flex items-center gap-3">
        <label htmlFor="pkw-rate" className="font-medium text-sm">
          Rate (€ per km)
        </label>
        <input
          id="pkw-rate"
          type="number"
          step="0.01"
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
          className="w-32 rounded-md border border-stroke bg-surface px-3 py-1.5 text-sm focus:border-primary focus:ring-primary/40"
        />
        <PrimaryButton
          onClick={handleSave}
          disabled={rate === rates.pkwRateEurPerKm}
          logId="rates.save-pkw"
        >
          Save
        </PrimaryButton>
      </div>
    </div>
  );
}

export function RatesManagement() {
  const [activeTab, setActiveTab] = useState<Tab>('vmt');
  const { resetRates } = useRates();

  return (
    <Page>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold text-display">
          Rate & Fare Management
        </h1>
        <SecondaryButton
          onClick={() => {
            if (
              window.confirm(
                'Are you sure you want to reset all rates and fares to their default values? This action cannot be undone.',
              )
            ) {
              resetRates();
            }
          }}
          className="px-3 py-1.5 text-xs"
          logId="rates.reset-all"
        >
          Reset All to Defaults
        </SecondaryButton>
      </div>

      <Card>
        <div className="flex gap-8">
          <nav className="w-1/4 flex-shrink-0">
            <ul className="space-y-1 font-medium">
              <TabButton
                id="vmt"
                label="VMT Fares"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
              <TabButton
                id="dticket"
                label="Deutschlandticket"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
              <TabButton
                id="pkw"
                label="PKW Rate"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            </ul>
          </nav>

          <main className="w-3/4 border-l border-line pl-8">
            {activeTab === 'vmt' && <VmtFaresManager />}
            {activeTab === 'dticket' && <DticketManager />}
            {activeTab === 'pkw' && <PkwRateManager />}
          </main>
        </div>
      </Card>
    </Page>
  );
}

function TabButton({
  id,
  label,
  activeTab,
  setActiveTab,
}: {
  id: Tab;
  label: string;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}) {
  return (
    <li>
      <button
        onClick={() => setActiveTab(id)}
        className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
          activeTab === id
            ? 'bg-primary/10 text-primary'
            : 'text-ink hover:bg-muted'
        }`}
      >
        {label}
      </button>
    </li>
  );
}

/**
 * This component is a temporary solution until the VMT fare management is
 * fully integrated into the new RatesManagement page.
 * @deprecated
 */
export function Vergleichsrechnung() {
  const { rates, setVmtFares } = useRates();
  return (
    <Page>
      <h1 className="text-2xl font-semibold text-display">
        VMT Vergleichsrechnung
      </h1>
      <Card>
        <div className="space-y-4">
          <p className="text-sm text-ink-dim">
            This is a temporary view of the VMT Fare Table. Please use the new{' '}
            <a href="/rates" className="text-primary underline">
              Rate & Fare Management
            </a>{' '}
            page to manage all rates.
          </p>
          <VmtFareTable fares={rates.vmtFares} onFaresChange={setVmtFares} />
        </div>
      </Card>
    </Page>
  );
}

/**
 * This placeholder is now obsolete as the functionality is provided
 * by the new `RatesManagement` page.
 * @deprecated
 */
export function PlaceholderVergleichsrechnung() {
  return <Placeholder title="VMT Vergleichsrechnung" />;
}