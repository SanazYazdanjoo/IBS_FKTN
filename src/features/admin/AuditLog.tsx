/**
 * Änderungsprotokoll — Admin-Ansicht aller protokollierten Änderungen
 * (Anwesenheit, Belege, Status, Ausnahmen, Formular-Speicherung,
 * Regel-Änderungen …), neueste zuerst. Jede Zeile: Aufzählungspunkt,
 * handelnde Person + Beschreibung, Zeitstempel am Zeilenende.
 */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useSession } from '../../app/session';
import { Card, Eyebrow, SecondaryButton } from '../../app/ui';
import { clearAuditLog, getAuditLog, subscribeAuditLog } from '../../app/auditLog';

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function AuditLogScreen() {
  const { user } = useSession();
  const entries = useSyncExternalStore(subscribeAuditLog, getAuditLog, getAuditLog);
  const [query, setQuery] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  // Bestätigungs-Zustand zurücksetzen, falls der Nutzer wegklickt und wiederkommt.
  useEffect(() => setConfirmClear(false), [entries.length]);

  if (user.role !== 'ADMIN') {
    return (
      <Card>
        <p className="text-sm text-ink-dim">Diese Ansicht ist nur für Admins zugänglich.</p>
      </Card>
    );
  }

  const filtered = query.trim()
    ? entries.filter((e) =>
        `${e.actor} ${e.message}`.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : entries;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <Eyebrow>Nachvollziehbarkeit</Eyebrow>
          <h1 className="text-2xl font-bold">Änderungsprotokoll</h1>
          <p className="mt-1 text-sm text-ink-dim">
            {entries.length} Einträge · jede Änderung an Anwesenheit, Belegen, Status,
            Ausnahmen, Formularen und Regeln wird hier automatisch vermerkt.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suchen: TN, Person, Aktion …"
            className="w-64 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm"
            aria-label="Protokoll durchsuchen"
          />
          {confirmClear ? (
            <>
              <span className="text-xs text-ink-dim">Wirklich alles löschen?</span>
              <SecondaryButton
                onClick={() => {
                  clearAuditLog();
                  setConfirmClear(false);
                }}
              >
                Ja, löschen
              </SecondaryButton>
              <SecondaryButton onClick={() => setConfirmClear(false)}>Abbrechen</SecondaryButton>
            </>
          ) : (
            entries.length > 0 && (
              <SecondaryButton onClick={() => setConfirmClear(true)}>Protokoll leeren</SecondaryButton>
            )
          )}
        </div>
      </div>

      <Card>
        {filtered.length === 0 ? (
          <p className="text-sm text-ink-dim">
            {entries.length === 0
              ? 'Noch keine Änderungen protokolliert.'
              : `Keine Treffer für „${query}".`}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-4 py-2.5 text-sm">
                <span className="flex gap-2">
                  <span aria-hidden className="text-ink-dim">•</span>
                  <span>
                    <span className="font-semibold">{e.actor}</span> — {e.message}
                  </span>
                </span>
                <span className="whitespace-nowrap text-xs text-ink-dim">
                  {formatTimestamp(e.at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="text-xs text-ink-dim">
        Hinweis: Das Protokoll wird im Browser gespeichert (lokal, kein Server) — es dient im
        Prototyp der Nachvollziehbarkeit, nicht als revisionssichere Ablage.
      </p>
    </div>
  );
}
