/**
 * Vergleichsrechnung (Admin, P15) — Arbeitsliste aller TN, deren Anwesenheit
 * im gewählten Monat unter der Zwei-Wochen-Schwelle liegt
 * (`rules.comparisonThresholdDays`) und die deshalb A (anteiliges Abo) gegen
 * B (VMT-Einzelfahrten) vergleichen müssen (Instruction §I). Die Engine
 * entscheidet bereits (min(A, B)) — diese Ansicht macht die Entscheidung nur
 * sichtbar.
 *
 * Aufbau: Kontextbox (Monat) oben, Arbeitsliste darunter, Formel-Detail zum
 * gewählten Fall. Der TN-Name in der Arbeitsliste verlinkt wie überall sonst
 * (Dashboard) auf TN-Detail; ein eigener Button „Formel ansehen" wählt den
 * Fall für das Formel-Detail auf dieser Seite, damit sich beide
 * Interaktionen nicht gegenseitig verdecken.
 *
 * Formel-Detail bietet dazu eine frei erweiterbare Options-Vergleichstabelle:
 * A (fix) steht immer als Zeile da, zusätzliche B-Zeilen (je eine wählbare
 * VMT-Tarifzone oder ein manueller Preis) lassen sich beliebig hinzufügen und
 * entfernen — die günstigste Zeile wird markiert, eine gewählte B-Option kann
 * per Klick als offizieller VMT-Einzelfahrpreis übernommen werden.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import MonthContextBox from '../../app/MonthContextBox';
import { useSession } from '../../app/session';
import { useRules } from '../../app/rules-context';
import { useVmtFares } from '../../app/vmt-fares-context';
import {
  Callout,
  Card,
  DangerButton,
  Eyebrow,
  SecondaryButton,
  StatusTag,
  TnName,
  statusColorClass,
  statusLabel,
} from '../../app/ui';
import { collectComparisonCases, type ComparisonCase } from '../../domain/vergleichsrechnung';
import { parseGermanDecimal, toFareLookup, type VmtFareRecord } from '../../domain/vmtFares';
import { VMT_TARIFF_GROUPS, VMT_TARIFF_STAND, findTariffZone } from '../../domain/vmtTariff';
import { formatEuro, roundEuro } from '../../domain/reimbursement';
import { monthLabel } from '../../adapters/mock/seed';
import { logChange } from '../../app/auditLog';
import type { MonthRecord } from '../../domain/types';

export default function Vergleichsrechnung() {
  const { user, storage, storageVersion, month, showAllMonths } = useSession();
  const { rules } = useRules();
  const { fares, setFarePrice } = useVmtFares();
  const [records, setRecords] = useState<MonthRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canEdit = user.role === 'ADMIN';

  useEffect(() => {
    if (showAllMonths) return;
    storage
      .listMonthRecords(user, month)
      .then(setRecords)
      .catch(() => setRecords([]));
  }, [user, storage, storageVersion, month, showAllMonths]);

  const fareLookup = useMemo(() => toFareLookup(fares), [fares]);
  const cases = useMemo(
    () => collectComparisonCases(records, rules, fareLookup),
    [records, rules, fareLookup],
  );

  const selected = cases.find((c) => c.participantId === selectedId) ?? cases[0] ?? null;

  const saveFare = (participantId: string, priceEur: number, tariffZoneId?: string) => {
    const previous = fares[participantId.toUpperCase()]?.priceEur;
    setFarePrice(participantId, priceEur, tariffZoneId);
    const source = tariffZoneId
      ? ` (${findTariffZone(tariffZoneId)?.label ?? tariffZoneId}, VMT-Tarif Stand ${VMT_TARIFF_STAND})`
      : ' (manuell erfasst)';
    logChange(
      user.name,
      `VMT-Einzelfahrpreis geändert: ${participantId.toUpperCase()} · ${
        previous !== undefined ? `${formatEuro(previous)} → ` : ''
      }${formatEuro(priceEur)}${source}`,
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Fahrtkostenerstattung · Admin</Eyebrow>
        <h1 className="font-display text-2xl font-semibold text-[var(--text-display)]">
          Vergleichsrechnung
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          TN mit weniger als {rules.comparisonThresholdDays} Anwesenheitstagen: anteiliges Abo (A)
          gegen VMT-Einzelfahrten (B) — die Engine erstattet automatisch den günstigeren Betrag
          (min(A, B)).
        </p>
      </div>

      <MonthContextBox />

      {showAllMonths ? (
        <Card>
          <p className="text-sm text-ink-dim">
            Die Vergleichsrechnung gilt je Monat — bitte oben einen einzelnen Monat wählen.
          </p>
        </Card>
      ) : (
        <>
          <Worklist
            cases={cases}
            month={month}
            thresholdDays={rules.comparisonThresholdDays}
            selectedId={selected?.participantId ?? null}
            onSelect={setSelectedId}
          />

          {selected && (
            <DetailPanel
              comparisonCase={selected}
              thresholdDays={rules.comparisonThresholdDays}
              fareEntry={fares[selected.participantId.toUpperCase()]}
              canEdit={canEdit}
              onSaveFare={(price, zoneId) => saveFare(selected.participantId, price, zoneId)}
            />
          )}
        </>
      )}
    </div>
  );
}

// ── 1) Arbeitsliste ──────────────────────────────────────────────────────

function Worklist({
  cases,
  month,
  thresholdDays,
  selectedId,
  onSelect,
}: {
  cases: ComparisonCase[];
  month: string;
  thresholdDays: number;
  selectedId: string | null;
  onSelect: (participantId: string) => void;
}) {
  return (
    <Card className="overflow-x-auto">
      <Eyebrow>Fälle, die eine Vergleichsrechnung brauchen · {monthLabel(month)} 2026</Eyebrow>
      {cases.length === 0 ? (
        <p className="mt-2 text-sm text-ink-dim">
          Für {monthLabel(month)} ist keine Vergleichsrechnung nötig — alle TN ≥ {thresholdDays}{' '}
          Anwesenheitstage.
        </p>
      ) : (
        <table className="mt-2 min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-ink-dim">
              <th className="py-2 pr-3">TN</th>
              <th className="py-2 pr-3 text-right">Anwesend / Arbeitstage</th>
              <th className="py-2 pr-3 text-right">Ticketpreis</th>
              <th className="py-2 pr-3 text-right">A-Betrag</th>
              <th className="py-2 pr-3 text-right">B-Betrag</th>
              <th className="py-2 pr-3">Methode</th>
              <th className="py-2 pr-3 text-right">Differenz</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">
                <span className="sr-only">Formel-Detail</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => {
              const blocked = c.view.result.blockers.length > 0;
              const { proRata, vmt } = c.view.result.trace;
              const diff = proRata && vmt ? Math.abs(proRata.amountEur - vmt.amountEur) : null;
              const methodLabel = blocked
                ? '— ungelöst'
                : c.view.result.method === 'VMT_SINGLE_FARES'
                  ? 'B · VMT'
                  : 'A · Abo';
              const isSelected = c.participantId === selectedId;
              return (
                <tr
                  key={c.participantId}
                  className={`border-b border-line/60 last:border-0 ${isSelected ? 'bg-primary/5' : ''}`}
                >
                  <td className="py-2 pr-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/admin/tn/${c.participantId}`} className="hover:underline">
                        <TnName id={c.participantId} name={c.participantName} link={false} />
                      </Link>
                      {blocked && <StatusTag kind="blocked">Preis fehlt</StatusTag>}
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-right">
                    {c.view.attendance.reimbursableDays}/{c.record.workdaysInMonth}
                  </td>
                  <td className="py-2 pr-3 text-right">{formatEuro(c.record.ticketPriceEur)}</td>
                  <td className="py-2 pr-3 text-right">
                    {proRata ? formatEuro(proRata.amountEur) : '—'}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    {vmt ? (
                      formatEuro(vmt.amountEur)
                    ) : (
                      <span className="font-semibold text-problem-ink">fehlt</span>
                    )}
                  </td>
                  <td className="py-2 pr-3">{methodLabel}</td>
                  <td className="py-2 pr-3 text-right">{diff !== null ? formatEuro(diff) : '—'}</td>
                  <td className={`py-2 pr-3 ${statusColorClass(c.record.status) || 'text-ink-dim'}`}>
                    {statusLabel(c.record.status)}
                  </td>
                  <td className="py-2 pr-3">
                    <SecondaryButton
                      onClick={() => onSelect(c.participantId)}
                      logId="vergleich-select-case"
                      className="px-3 py-1 text-xs"
                    >
                      Formel ansehen
                    </SecondaryButton>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <p className="mt-2 text-xs text-ink-dim">
        TN anklicken → TN-Detail · „Formel ansehen" zeigt die Berechnung unten auf dieser Seite.
      </p>
    </Card>
  );
}

// ── 2) Detail-Panel zum gewählten Fall ───────────────────────────────────

function DetailPanel({
  comparisonCase,
  thresholdDays,
  fareEntry,
  canEdit,
  onSaveFare,
}: {
  comparisonCase: ComparisonCase;
  thresholdDays: number;
  fareEntry: VmtFareRecord | undefined;
  canEdit: boolean;
  onSaveFare: (priceEur: number, tariffZoneId?: string) => void;
}) {
  const { record, view } = comparisonCase;
  const { proRata, chosenBecause } = view.result.trace;

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Eyebrow>
          Formel-Detail · <TnName id={record.participantId} name={record.participantName} />
        </Eyebrow>
        <span className="text-xs text-ink-dim">
          {view.attendance.reimbursableDays} Anwesenheitstage &lt; {thresholdDays} (Instruction §I)
        </span>
      </div>

      <div className="space-y-4">
        {proRata && (
          <OptionsComparison
            key={record.participantId}
            proRataEur={proRata.amountEur}
            proRataFormula={proRata.formula}
            reimbursableDays={view.attendance.reimbursableDays}
            fareEntry={fareEntry}
            canEdit={canEdit}
            onSaveFare={onSaveFare}
          />
        )}

        {chosenBecause && <p className="text-sm text-ink-dim">{chosenBecause}</p>}
      </div>

      <div className="border-t border-line pt-3">
        <p className="text-sm">
          Erstattungsbetrag:{' '}
          <strong className="text-primary">{formatEuro(view.result.amountEur)}</strong>
        </p>
      </div>

      {view.result.blockers.length > 0 && (
        <div className="space-y-2">
          {view.result.blockers.map((b) => (
            <Callout key={b} kind="problem">
              {b}
            </Callout>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── 3) Options-Vergleichstabelle (frei erweiterbar) ──────────────────────

interface FareOptionRow {
  id: number;
  tariffZoneId?: string;
  raw: string;
}

/**
 * Vergleicht A (fix, aus der Engine) gegen beliebig viele B-Optionen
 * (VMT-Einzelfahrten). Jede B-Zeile wählt entweder eine offizielle
 * Tarifzone oder trägt einen manuellen Preis ein; „+ Option hinzufügen"
 * legt weitere Zeilen an, „Entfernen" nimmt sie wieder raus. Die günstigste
 * Zeile (A oder eine B-Option) wird markiert, damit die beste Wahl auf
 * einen Blick klar ist. „Als Preis übernehmen" macht eine B-Option zum
 * offiziellen VMT-Einzelfahrpreis des TN (fließt sofort in die Engine ein).
 */
function OptionsComparison({
  proRataEur,
  proRataFormula,
  reimbursableDays,
  fareEntry,
  canEdit,
  onSaveFare,
}: {
  proRataEur: number;
  proRataFormula: string;
  reimbursableDays: number;
  fareEntry: VmtFareRecord | undefined;
  canEdit: boolean;
  onSaveFare: (priceEur: number, tariffZoneId?: string) => void;
}) {
  const nextRowId = useRef(1);
  const [rows, setRows] = useState<FareOptionRow[]>(() => [
    {
      id: nextRowId.current++,
      tariffZoneId: fareEntry?.tariffZoneId,
      raw: fareEntry ? fareEntry.priceEur.toFixed(2).replace('.', ',') : '',
    },
  ]);

  const addRow = () =>
    setRows((prev) => [...prev, { id: nextRowId.current++, tariffZoneId: undefined, raw: '' }]);
  const removeRow = (id: number) => setRows((prev) => prev.filter((r) => r.id !== id));
  const updateRow = (id: number, patch: Partial<FareOptionRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const computed = rows.map((row) => {
    const priceEur = parseGermanDecimal(row.raw);
    const amountEur = priceEur !== null ? roundEuro(reimbursableDays * 2 * priceEur) : null;
    const formula =
      priceEur !== null ? `${reimbursableDays} Tage × 2 × ${formatEuro(priceEur)}` : null;
    return { ...row, priceEur, amountEur, formula };
  });

  const validAmounts = [proRataEur, ...computed.map((r) => r.amountEur).filter((a): a is number => a !== null)];
  const minAmount = Math.min(...validAmounts);

  return (
    <div className="space-y-3">
      <table className="min-w-full text-left text-sm">
        <caption className="sr-only">Vergleich aller Optionen, günstigste markiert</caption>
        <thead>
          <tr className="border-b border-line text-xs text-ink-dim">
            <th className="py-2 pr-3">Option</th>
            <th className="py-2 pr-3">Formel</th>
            <th className="py-2 pr-3 text-right">Betrag</th>
            <th className="py-2 pr-3">
              <span className="sr-only">Aktionen</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className={`border-b border-line/60 ${proRataEur === minAmount ? 'font-semibold' : 'text-ink-dim'}`}>
            <td className="py-2 pr-3">
              A · Anteiliges Abo
              {proRataEur === minAmount && <span className="ml-2 text-primary">✓ günstiger</span>}
            </td>
            <td className="py-2 pr-3 font-mono text-xs">{proRataFormula}</td>
            <td className="py-2 pr-3 text-right">{formatEuro(proRataEur)}</td>
            <td className="py-2 pr-3" />
          </tr>
          {computed.map((row) => {
            const wins = row.amountEur !== null && row.amountEur === minAmount;
            return (
              <tr
                key={row.id}
                className={`border-b border-line/60 last:border-0 align-top ${wins ? 'font-semibold' : 'text-ink-dim'}`}
              >
                <td className="py-2 pr-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-ink">B · VMT-Einzelfahrten</span>
                    {wins && <span className="text-primary">✓ günstiger</span>}
                  </div>
                  <div className="mt-1">
                    <FareOptionEditor row={row} canEdit={canEdit} onChange={(patch) => updateRow(row.id, patch)} />
                  </div>
                </td>
                <td className="py-2 pr-3 font-mono text-xs">{row.formula ?? '—'}</td>
                <td className="py-2 pr-3 text-right">
                  {row.amountEur !== null ? formatEuro(row.amountEur) : '—'}
                </td>
                <td className="py-2 pr-3">
                  {canEdit && (
                    <div className="flex flex-wrap items-center gap-2">
                      <SecondaryButton
                        onClick={() => onSaveFare(row.priceEur as number, row.tariffZoneId)}
                        disabled={row.priceEur === null}
                        logId="vergleich-row-apply"
                        className="px-3 py-1 text-xs"
                      >
                        Als Preis übernehmen
                      </SecondaryButton>
                      <DangerButton
                        onClick={() => removeRow(row.id)}
                        logId="vergleich-row-remove"
                        className="px-3 py-1 text-xs"
                      >
                        Entfernen
                      </DangerButton>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {canEdit && (
        <SecondaryButton onClick={addRow} logId="vergleich-row-add" className="px-4 py-1.5 text-xs">
          + Option hinzufügen
        </SecondaryButton>
      )}
      {computed.length === 0 && (
        <Callout kind="problem">
          Keine VMT-Option eingetragen — die Erstattung bleibt vorläufig bei A, bis ein Preis
          gepflegt ist.
        </Callout>
      )}
    </div>
  );
}

function FareOptionEditor({
  row,
  canEdit,
  onChange,
}: {
  row: FareOptionRow;
  canEdit: boolean;
  onChange: (patch: Partial<FareOptionRow>) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={row.tariffZoneId ?? ''}
        disabled={!canEdit}
        data-log-id="vergleich-row-zone-select"
        onChange={(e) => {
          const nextId = e.target.value || undefined;
          const zone = nextId ? findTariffZone(nextId) : undefined;
          onChange({
            tariffZoneId: nextId,
            raw: zone ? zone.einzelfahrtEur.toFixed(2).replace('.', ',') : row.raw,
          });
        }}
        className="rounded-lg border border-line bg-surface px-2 py-1 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">— manuell —</option>
        {VMT_TARIFF_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.label} · {formatEuro(z.einzelfahrtEur)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <input
        type="text"
        inputMode="decimal"
        value={row.raw}
        disabled={!canEdit}
        data-log-id="vergleich-row-price-input"
        onChange={(e) => onChange({ raw: e.target.value, tariffZoneId: undefined })}
        placeholder="z. B. 2,40"
        className="w-24 rounded-lg border border-line bg-surface px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <span className="text-xs text-ink-dim">€</span>
    </div>
  );
}