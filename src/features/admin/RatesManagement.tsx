/**
 * Raten & Tarife (Admin) — zentrale Pflegeseite für alle variablen
 * Finanzparameter, die sonst als Code-Konstanten verstreut wären:
 * VMT-Einzelfahrpreise (Zonen-Matrix), Deutschlandticket-Preis (inkl.
 * Sozialticket) und PKW-Kilometersatz. Jede Änderung läuft über den
 * jeweiligen Kontext (`vmt-tariff-context.tsx`, `rules-context.tsx`) und
 * wirkt dadurch sofort in Vergleichsrechnung, Dashboard und TN-Flow — ohne
 * Neuladen der Seite — und wird in localStorage gespiegelt, übersteht also
 * auch einen Reload.
 */
import { useState } from 'react';
import { useSession } from '../../app/session';
import { useRules } from '../../app/rules-context';
import { useVmtTariff } from '../../app/vmt-tariff-context';
import { Callout, Card, DangerButton, Eyebrow, SecondaryButton } from '../../app/ui';
import { parseGermanDecimal } from '../../domain/vmtFares';
import { formatEuro } from '../../domain/reimbursement';
import { defaultRules } from '../../domain/rules';
import { logChange } from '../../app/auditLog';
import type { VmtTariffZone } from '../../domain/vmtTariff';

type TabId = 'vmt' | 'dticket' | 'pkw';

const TABS: { id: TabId; label: string }[] = [
  { id: 'vmt', label: 'VMT-Einzelfahrpreise' },
  { id: 'dticket', label: 'Deutschlandticket' },
  { id: 'pkw', label: 'PKW-Erstattung' },
];

export default function RatesManagement() {
  const { user } = useSession();
  const canEdit = user.role === 'ADMIN';
  const [tab, setTab] = useState<TabId>('vmt');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Raten & Tarife</h1>
        <p className="mt-1 text-sm text-ink-dim">
          Zentrale Pflege aller variablen Erstattungssätze — nichts davon ist im Code
          hartkodiert. Änderungen wirken sofort in Vergleichsrechnung, Dashboard und
          TN-Flow, ohne Neuladen der Seite.
        </p>
      </div>

      {!canEdit && (
        <Callout kind="note">
          Nur Admins können Sätze ändern — diese Ansicht ist in Ihrer Rolle nur lesbar.
        </Callout>
      )}

      <div className="flex gap-2 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            data-log-id={`raten-tab-${t.id}`}
            className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition ${
              tab === t.id
                ? 'border-b-2 border-primary text-primary'
                : 'text-ink-dim hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'vmt' && <VmtFaresTab canEdit={canEdit} actorName={user.name} />}
      {tab === 'dticket' && <DTicketTab canEdit={canEdit} actorName={user.name} />}
      {tab === 'pkw' && <PkwTab canEdit={canEdit} actorName={user.name} />}
    </div>
  );
}

/**
 * Zweistufiger Reset-Button — ein Klick fragt nach, erst der zweite setzt
 * zurück. Vermeidet ein Zurücksetzen aus Versehen, ohne ein separates
 * Dialogfenster einzuführen (P: kein Modal-Overkill für eine Bestätigung).
 */
function ResetButton({ onConfirm }: { onConfirm: () => void }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <DangerButton
      onClick={() => {
        if (!confirming) {
          setConfirming(true);
          return;
        }
        onConfirm();
        setConfirming(false);
      }}
      logId="raten-reset"
      className="px-3 py-1 text-xs"
    >
      {confirming ? 'Wirklich zurücksetzen?' : 'Auf Standard zurücksetzen'}
    </DangerButton>
  );
}

/** Editierbares Preisfeld: Eingabe (deutsches Komma erlaubt), Speichern nur bei gültiger Änderung. */
function PriceField({
  valueEur,
  unit,
  canEdit,
  onSave,
}: {
  valueEur: number;
  unit: string;
  canEdit: boolean;
  onSave: (priceEur: number) => void;
}) {
  const [raw, setRaw] = useState(valueEur.toFixed(2).replace('.', ','));
  const parsed = parseGermanDecimal(raw);
  const dirty = parsed !== null && parsed !== valueEur;
  const invalid = raw.trim() !== '' && parsed === null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={raw}
        disabled={!canEdit}
        onChange={(e) => setRaw(e.target.value)}
        inputMode="decimal"
        data-log-id="raten-price-input"
        className="w-24 rounded-lg border border-line bg-surface px-2 py-1.5 text-right text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <span className="text-sm text-ink-dim">{unit}</span>
      {canEdit && dirty && (
        <SecondaryButton onClick={() => onSave(parsed!)} logId="raten-price-save" className="px-3 py-1 text-xs">
          Speichern
        </SecondaryButton>
      )}
      {invalid && <span className="text-xs font-semibold text-danger">Ungültige Eingabe</span>}
    </div>
  );
}

// ── VMT-Einzelfahrpreise ─────────────────────────────────────────────────

function VmtFaresTab({ canEdit, actorName }: { canEdit: boolean; actorName: string }) {
  const { groups, setZonePrice, resetTariff } = useVmtTariff();

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Eyebrow>Offizielle VMT-Tarifzonen · Einzelfahrt (Erwachsene)</Eyebrow>
        {canEdit && (
          <ResetButton
            onConfirm={() => {
              resetTariff();
              logChange(actorName, 'Regel geändert: VMT-Tarifzonen → Standardpreise zurückgesetzt');
            }}
          />
        )}
      </div>
      <p className="mt-1 text-xs text-ink-dim">
        Diese Preise fließen in die Vergleichsrechnung (B, Instruction §I) ein, sobald eine TN
        einer Zone zugeordnet ist — Änderungen wirken sofort, auch für bereits offene Fälle.
      </p>
      <div className="mt-3 space-y-5">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="text-xs font-semibold uppercase tracking-label text-ink-dim">
              {group.label}
            </p>
            <table className="mt-1 min-w-full text-left text-sm">
              <tbody>
                {group.zones.map((zone) => (
                  <ZoneRow
                    key={zone.id}
                    zone={zone}
                    canEdit={canEdit}
                    onSave={(priceEur) => {
                      setZonePrice(zone.id, priceEur);
                      logChange(
                        actorName,
                        `Regel geändert: VMT-Tarifzone „${zone.label}" → ${formatEuro(priceEur)}`,
                      );
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ZoneRow({
  zone,
  canEdit,
  onSave,
}: {
  zone: VmtTariffZone;
  canEdit: boolean;
  onSave: (priceEur: number) => void;
}) {
  return (
    <tr className="border-b border-line/60 last:border-0">
      <td className="py-1.5 pr-3 text-ink">{zone.label}</td>
      <td className="py-1.5 pr-3">
        <PriceField
          key={zone.einzelfahrtEur}
          valueEur={zone.einzelfahrtEur}
          unit="€"
          canEdit={canEdit}
          onSave={onSave}
        />
      </td>
    </tr>
  );
}

// ── Deutschlandticket ────────────────────────────────────────────────────

function DTicketTab({ canEdit, actorName }: { canEdit: boolean; actorName: string }) {
  const { rules, setRules } = useRules();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canEdit && (
          <ResetButton
            onConfirm={() => {
              setRules({
                ...rules,
                deutschlandticketPriceEur: defaultRules.deutschlandticketPriceEur,
                sozialTicketPriceByYear: defaultRules.sozialTicketPriceByYear,
              });
              logChange(actorName, 'Regel geändert: Deutschlandticket-Preise → Standard zurückgesetzt');
            }}
          />
        )}
      </div>

      <Card>
        <Eyebrow>Deutschlandticket · Monatspreis</Eyebrow>
        <p className="mt-1 text-xs text-ink-dim">
          Grundlage für die anteilige Abo-Erstattung (A, Instruction §I) — wirkt in
          Vergleichsrechnung, Dashboard und TN-Flow.
        </p>
        <div className="mt-3">
          <PriceField
            key={rules.deutschlandticketPriceEur}
            valueEur={rules.deutschlandticketPriceEur}
            unit="€ / Monat"
            canEdit={canEdit}
            onSave={(priceEur) => {
              setRules({ ...rules, deutschlandticketPriceEur: priceEur });
              logChange(actorName, `Regel geändert: Deutschlandticket-Preis → ${formatEuro(priceEur)}`);
            }}
          />
        </div>
      </Card>

      <Card>
        <Eyebrow>Sozial-Deutschlandticket (Stadtwirtschaft Weimar) · je Jahr</Eyebrow>
        <div className="mt-3 space-y-2">
          {Object.entries(rules.sozialTicketPriceByYear)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([year, priceEur]) => (
              <div key={year} className="flex items-center gap-2">
                <span className="w-12 text-sm text-ink-dim">{year}</span>
                <PriceField
                  key={`${year}:${priceEur}`}
                  valueEur={priceEur}
                  unit="€"
                  canEdit={canEdit}
                  onSave={(nextPriceEur) => {
                    setRules({
                      ...rules,
                      sozialTicketPriceByYear: {
                        ...rules.sozialTicketPriceByYear,
                        [year]: nextPriceEur,
                      },
                    });
                    logChange(actorName, `Regel geändert: Sozialticket ${year} → ${formatEuro(nextPriceEur)}`);
                  }}
                />
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
}

// ── PKW-Erstattung ───────────────────────────────────────────────────────

function PkwTab({ canEdit, actorName }: { canEdit: boolean; actorName: string }) {
  const { rules, setRules } = useRules();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canEdit && (
          <ResetButton
            onConfirm={() => {
              setRules({ ...rules, pkwRatePerKmEur: defaultRules.pkwRatePerKmEur });
              logChange(
                actorName,
                `Regel geändert: PKW-Kilometersatz → Standard (${formatEuro(defaultRules.pkwRatePerKmEur)}/km) zurückgesetzt`,
              );
            }}
          />
        )}
      </div>
      <Card>
        <Eyebrow>PKW-Erstattung · Kilometersatz</Eyebrow>
        <p className="mt-1 text-xs text-ink-dim">
          Formel laut Abrechnungsformular: Anwesenheitstage × km × 2 (Hin- und Rückfahrt) × Satz.
        </p>
        <div className="mt-3">
          <PriceField
            key={rules.pkwRatePerKmEur}
            valueEur={rules.pkwRatePerKmEur}
            unit="€ / km"
            canEdit={canEdit}
            onSave={(rateEur) => {
              setRules({ ...rules, pkwRatePerKmEur: rateEur });
              logChange(actorName, `Regel geändert: PKW-Kilometersatz → ${formatEuro(rateEur)}/km`);
            }}
          />
        </div>
      </Card>
    </div>
  );
}
