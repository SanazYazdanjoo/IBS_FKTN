/** Einstellungen: Unterschrifts-Modus (Papier/digital) und Abrechnungsregel. */
import { useRules } from '../../app/rules-context';
import { Card, Eyebrow } from '../../app/ui';

export default function SignatureSettings() {
  const { rules, setRules } = useRules();

  return (
    <div className="space-y-4">
      <Eyebrow>Einstellungen · Unterschrift</Eyebrow>

      <Card className={rules.signatureMode === 'PAPER' ? 'border-primary' : ''}>
        <button className="w-full text-left" onClick={() => setRules({ ...rules, signatureMode: 'PAPER' })}>
          <p className="font-display font-bold">
            Modus A · Unterschrift auf Papier{' '}
            <span className="text-xs font-normal text-ink-dim">Standard · heute</span>
          </p>
          <p className="mt-1 text-sm text-ink-dim">
            TN unterschreibt im Institut oder per Post. Pipeline erhält den Status
            „Unterschrift ausstehend" mit Tage-Zähler in Dashboard und Freigabe — die
            Papier-Wartezeit wird sichtbar und nachfassbar statt unsichtbar (P7).
          </p>
        </button>
      </Card>

      <Card className={rules.signatureMode === 'DIGITAL' ? 'border-primary' : ''}>
        <button className="w-full text-left" onClick={() => setRules({ ...rules, signatureMode: 'DIGITAL' })}>
          <p className="font-display font-bold">
            Modus B · Digitale Bestätigung{' '}
            <span className="text-xs font-normal text-ink-dim">Zukunft</span>
          </p>
          <p className="mt-1 text-sm text-ink-dim">
            Authentifizierter In-App-Klick mit Zeitstempel + Audit-Log-Zeile (FR-09/FR-14).
          </p>
          <p className="mt-2 rounded-lg bg-highlight-weak p-2 text-xs font-semibold">
            „Einfache elektronische Signatur" — Freigabe durch Datenschutzbeauftragte
            erforderlich (NFR-01)
          </p>
        </button>
      </Card>

      <p className="text-xs text-ink-dim">
        Speicherung aller Unterlagen: IBS-eigene Cloud, keine externen Dienste (NFR-01) · Ein
        Schalter statt Annahme — der Prototyp zeigt beide Realitäten
      </p>

      <Card>
        <Eyebrow>✓ Abrechnungsregel (aufgelöst durch die Anwesenheitsliste-Legende)</Eyebrow>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={rules.sickDaysAreReimbursable}
            onChange={(e) => setRules({ ...rules, sickDaysAreReimbursable: e.target.checked })}
          />
          Legende-Modus: E/K/X/(x) zählen als anwesend (Standard). Abwählen = historisch
          strikte Lesart (nur x/E), z. B. für die Prüfung alter Monate.
        </label>
        <p className="mt-1 text-xs text-ink-dim">
          Quelle: „E / K / X / (x) können als anwesend abgerechnet werden. A / U gelten als
          Fehltag." — Anwesenheitsliste 2026, Legende.
        </p>
      </Card>
    </div>
  );
}
