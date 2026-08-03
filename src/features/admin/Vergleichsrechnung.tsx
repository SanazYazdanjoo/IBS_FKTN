/**
 * Vergleichsrechnung (Admin, P15) — Arbeitsliste aller TN, deren Anwesenheit
 * im gewählten Monat unter der Zwei-Wochen-Schwelle liegt
 * (`rules.comparisonThresholdDays`) und die deshalb A (anteiliges Abo) gegen
 * B (VMT-Einzelfahrten) vergleichen müssen (Instruction §I). Die Engine
 * entscheidet bereits (min(A, B)) — diese Ansicht macht die Entscheidung nur
 * sichtbar (FormulaBox-Trace wie in TnDetail.tsx) und pflegt die
 * VMT-Einzelfahrpreis-Tabelle, aus der B stammt.
 *
 * Aufbau: Kontextbox (Monat) oben, Arbeitsliste darunter, Formel-Detail zum
 * gewählten Fall, Fahrpreis-Tabelle zuletzt. Der TN-Name in der Arbeitsliste
 * verlinkt wie überall sonst (Dashboard) auf TN-Detail; ein eigener Button
 * „Formel ansehen" wählt den Fall für das Formel-Detail auf dieser Seite,
 * damit sich beide Interaktionen nicht gegenseitig verdecken.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import MonthContextBox from '../../app/MonthContextBox';
import { useSession } from '../../app/session';
import { useRules } from '../../app/rules-context';
import { useVmtFares } from '../../app/vmt-fares-context';
import { useFieldLog } from '../../logging/react.tsx';
import {
  Callout,
  Card,
  Eyebrow,
  FormulaBox,
  SecondaryButton,
  StatusTag,
  TnName,
  statusColorClass,
  statusLabel,
} from '../../app/ui';
import { collectComparisonCases, type ComparisonCase } from '../../domain/vergleichsrechnung';
import { parseGermanDecimal, toFareLookup, type VmtFareRecord } from '../../domain/vmtFares';
import { VMT_TARIFF_GROUPS, VMT_TARIFF_STAND, findTariffZone } from '../../domain/vmtTariff';
import { formatEuro } from '../../domain/reimbursement';
import { getMaster } from '../../adapters/masters';
import { monthLabel } from '../../adapters/mock/seed';
import { logChange } from '../../app/auditLog';
import type { StorageAdapter } from '../../adapters/types';
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

  const relevantFareIds = useMemo(() => {
    const ids = new Set(Object.keys(fares));
    cases.forEach((c) => ids.add(c.participantId));
    return [...ids].sort();
  }, [cases, fares]);

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

          <FareTable
            participantIds={relevantFareIds}
            fares={fares}
            storage={storage}
            canEdit={canEdit}
            onSave={saveFare}
          />
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
  const { proRata, vmt, chosenBecause } = view.result.trace;

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
         {proRata && vmt && (
          <ComparisonVerdict
            proRataEur={proRata.amountEur}
            vmtEur={vmt.amountEur}
            method={view.result.method === 'VMT_SINGLE_FARES' ? 'VMT_SINGLE_FARES' : 'PRO_RATA'}
          />
        )}
        
        {proRata && (
          <FormulaBox
            label="A · Anteiliges Abo"
            terms={[
              { name: 'Ticketpreis', value: formatEuro(record.ticketPriceEur) },
              { name: 'Arbeitstage', value: String(record.workdaysInMonth), op: '÷' },
              {
                name: 'Anwesenheitstage',
                value: String(view.attendance.reimbursableDays),
                op: '×',
              },
            ]}
            result={formatEuro(proRata.amountEur)}
          />
        )}

        {vmt ? (
          <FormulaBox
            label={`B · VMT-Einzelfahrten${
              view.result.method === 'VMT_SINGLE_FARES' ? ' ✓ günstiger' : ''
            }`}
            raw={vmt.formula}
            result={formatEuro(vmt.amountEur)}
          />
        ) : (
          <div className="rounded-xl border border-line bg-surface p-3">
            <p className="mb-2 text-xs font-semibold text-ink-dim">B · VMT-Einzelfahrten</p>
            <Callout kind="problem">
              Kein VMT-Einzelfahrpreis für {record.participantId} hinterlegt — die Erstattung
              bleibt vorläufig bei A, bis ein Preis gepflegt ist.
            </Callout>
            {canEdit ? (
              <div className="mt-3">
                <FareInlineEditor
                  participantId={record.participantId}
                  entry={fareEntry}
                  onSave={onSaveFare}
                />
              </div>
            ) : (
              <p className="mt-2 text-xs text-ink-dim">Preis pflegen: Admin-Rolle erforderlich.</p>
            )}
          </div>
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

// ── 3) VMT-Einzelfahrpreis-Tabelle (P15-Kern) ────────────────────────────

function FareTable({
  participantIds,
  fares,
  storage,
  canEdit,
  onSave,
}: {
  participantIds: string[];
  fares: Record<string, VmtFareRecord>;
  storage: StorageAdapter;
  canEdit: boolean;
  onSave: (participantId: string, priceEur: number, tariffZoneId?: string) => void;
}) {
  return (
    <Card className="overflow-x-auto">
      <Eyebrow>VMT-Einzelfahrpreise · gepflegte Tabelle (P15)</Eyebrow>
      <p className="mt-1 text-xs text-ink-dim">
        Grundlage für B in der Vergleichsrechnung. Eine Änderung wirkt sich sofort auf alle
        betroffenen Berechnungen aus und löst offene Blocker auf.
      </p>
      {participantIds.length === 0 ? (
        <p className="mt-2 text-sm text-ink-dim">Aktuell keine Fahrpreise zu pflegen.</p>
      ) : (
        <table className="mt-2 min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-ink-dim">
              <th className="py-2 pr-3">TN</th>
              <th className="py-2 pr-3">Zone</th>
              <th className="py-2 pr-3">Preis</th>
              <th className="py-2 pr-3">Stand</th>
            </tr>
          </thead>
          <tbody>
            {participantIds.map((id) => (
              <FareRow
                key={id}
                participantId={id}
                masterZone={getMaster(storage, id)?.vmtZone ?? ''}
                entry={fares[id]}
                canEdit={canEdit}
                onSave={(price, zoneId) => onSave(id, price, zoneId)}
              />
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function FareRow({
  participantId,
  masterZone,
  entry,
  canEdit,
  onSave,
}: {
  participantId: string;
  masterZone: string;
  entry: VmtFareRecord | undefined;
  canEdit: boolean;
  onSave: (priceEur: number, tariffZoneId?: string) => void;
}) {
  const tariffLabel = entry?.tariffZoneId ? findTariffZone(entry.tariffZoneId)?.label : undefined;
  return (
    <tr className="border-b border-line/60 last:border-0">
      <td className="py-2 pr-3 font-semibold">{participantId}</td>
      <td className="py-2 pr-3 text-ink-dim">
        {tariffLabel ?? (masterZone || '—')}
        {tariffLabel && (
          <span className="ml-1 text-[10px] uppercase tracking-wider text-ink-dim">
            · VMT-Tarif {new Date(VMT_TARIFF_STAND).toLocaleDateString('de-DE')}
          </span>
        )}
      </td>
      <td className="py-2 pr-3">
        <FareInlineEditor
          participantId={participantId}
          entry={entry}
          onSave={onSave}
          disabled={!canEdit}
        />
      </td>
      <td className="py-2 pr-3 text-xs text-ink-dim">
        {entry ? new Date(entry.updatedAt).toLocaleDateString('de-DE') : 'nicht gepflegt'}
      </td>
    </tr>
  );
}

/**
 * Preisfeld mit Validierung (positiv, max. 2 Nachkommastellen, Komma
 * erlaubt) plus Auswahl aus dem offiziellen VMT-Tarif (Stand
 * `VMT_TARIFF_STAND`) — eine Admin wählt die zutreffende Preisstufe statt
 * einen Preis frei zu tippen und übernimmt so garantiert den korrekten,
 * geprüften Wert. Manuelles Eingeben bleibt für Sonderfälle möglich, die
 * sich keiner Preisstufe zuordnen lassen (z. B. "VMT Gesamtnetz"-Verträge);
 * jede Handeingabe verwirft die zuvor gewählte Tarifzone, damit ein
 * abweichender Preis nie fälschlich als "aus dem offiziellen Tarif" gilt.
 * Gemeinsam von Fahrpreis-Tabelle und Detail-Panel genutzt.
 */
function FareInlineEditor({
  participantId,
  entry,
  onSave,
  disabled = false,
}: {
  participantId: string;
  entry: VmtFareRecord | undefined;
  onSave: (priceEur: number, tariffZoneId?: string) => void;
  disabled?: boolean;
}) {
  const fieldLog = useFieldLog('vmt_fare_price');
  const [raw, setRaw] = useState(entry ? entry.priceEur.toFixed(2).replace('.', ',') : '');
  const [zoneId, setZoneId] = useState<string | undefined>(entry?.tariffZoneId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRaw(entry ? entry.priceEur.toFixed(2).replace('.', ',') : '');
    setZoneId(entry?.tariffZoneId);
  }, [entry?.priceEur, entry?.tariffZoneId]);

  const parsed = parseGermanDecimal(raw);
  const dirty =
    raw.trim() !== '' &&
    parsed !== null &&
    (parsed !== entry?.priceEur || zoneId !== entry?.tariffZoneId);

  const save = () => {
    if (parsed === null) {
      setError('Positiver Preis, max. 2 Nachkommastellen (z. B. 2,40).');
      fieldLog.reportValidationFail('INVALID_PRICE');
      return;
    }
    setError(null);
    onSave(parsed, zoneId);
  };

  const fieldId = `vmt-fare-${participantId}`;
  const selectId = `vmt-fare-zone-${participantId}`;

  return (
    <div>
      <label className="sr-only" htmlFor={selectId}>
        VMT-Tarifzone für {participantId}
      </label>
      <label className="sr-only" htmlFor={fieldId}>
        VMT-Einzelfahrpreis für {participantId}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <select
          id={selectId}
          value={zoneId ?? ''}
          disabled={disabled}
          data-log-id="vmt-fare-zone-select"
          onChange={(e) => {
            const nextId = e.target.value || undefined;
            setZoneId(nextId);
            setError(null);
            const zone = nextId ? findTariffZone(nextId) : undefined;
            if (zone) setRaw(zone.einzelfahrtEur.toFixed(2).replace('.', ','));
            fieldLog.onChange();
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
          id={fieldId}
          type="text"
          inputMode="decimal"
          value={raw}
          disabled={disabled}
          data-log-id="vmt-fare-input"
          onFocus={fieldLog.onFocus}
          onChange={(e) => {
            setRaw(e.target.value);
            setZoneId(undefined);
            if (error) fieldLog.reportCorrection();
            setError(null);
            fieldLog.onChange();
          }}
          onBlur={fieldLog.onBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              save();
            }
          }}
          placeholder="z. B. 2,40"
          aria-invalid={error ? true : undefined}
          className="w-24 rounded-lg border border-line bg-surface px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <span className="text-xs text-ink-dim">€</span>
        {!disabled && (
          <SecondaryButton
            onClick={save}
            disabled={!dirty}
            logId="vmt-fare-save"
            className="px-3 py-1 text-xs"
          >
            Speichern
          </SecondaryButton>
        )}
      </div>
      {error && <p className="mt-1 text-xs font-semibold text-danger">{error}</p>}
    </div>
  );
}
