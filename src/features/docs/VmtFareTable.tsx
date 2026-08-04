/**
 * A reusable table component for viewing and editing VMT (Verkehrsverbund
 * Mittelthüringen) single fares. It allows for inline editing of prices.
 */
import { VmtFare } from '../../domain/vmtFares';
import { formatEuro } from '../../domain/format';

export function VmtFareTable({
  fares,
  onFaresChange,
}: {
  fares: VmtFare[];
  onFaresChange: (fares: VmtFare[]) => void;
}) {
  const handlePriceChange = (index: number, newPrice: number) => {
    const newFares = [...fares];
    newFares[index] = { ...newFares[index], priceEur: newPrice };
    onFaresChange(newFares);
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="min-w-full divide-y divide-line">
        <thead className="bg-surface">
          <tr>
            <th
              scope="col"
              className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-ink-dim"
            >
              Zone
            </th>
            <th
              scope="col"
              className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-ink-dim"
            >
              Description
            </th>
            <th
              scope="col"
              className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-ink-dim"
            >
              Price (€)
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-surface">
          {fares.map((fare, index) => (
            <tr key={fare.id}>
              <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-ink">
                {fare.zone}
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-sm text-ink-dim">
                {fare.description}
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-sm text-ink-dim">
                <input
                  type="number"
                  value={fare.priceEur}
                  onChange={(e) =>
                    handlePriceChange(index, Number(e.target.value))
                  }
                  className="w-24 rounded-md border border-stroke bg-surface px-2 py-1 text-sm focus:border-primary focus:ring-primary/40"
                  step="0.01"
                  aria-label={`Price for zone ${fare.zone}`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}