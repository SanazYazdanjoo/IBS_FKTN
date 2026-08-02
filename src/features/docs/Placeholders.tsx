/**
 * Platzhalterseiten für Funktionen, die noch nicht gebaut sind, sowie die
 * Dokumentationsseite.
 *
 * Bewusst als eigene Menüpunkte sichtbar und nicht versteckt: der geplante
 * Umfang bleibt so für alle Beteiligten erkennbar. Damit niemand sie für
 * fertig hält, sind die Einträge in der Navigation gedämpft dargestellt.
 */
import { useState } from 'react';
import { Card, Eyebrow } from '../../app/ui';

export function Placeholder({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <div>
        <Eyebrow>In Arbeit</Eyebrow>
        <h1 className="text-2xl font-semibold text-[var(--text-display)]">{title}</h1>
      </div>
      <Card>
        <p className="text-sm text-ink-dim">to be implemented</p>
      </Card>
    </div>
  );
}

export function AutoReminderEmails() {
  return <Placeholder title="Auto-Reminder Emails" />;
}

/** Ablageort der Grafik; die Datei wird separat hinterlegt. */
const DOC_SVG = `${import.meta.env.BASE_URL}assets/documentation.svg`;

export function Documentation() {
  const [failed, setFailed] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <Eyebrow>Dokumentation</Eyebrow>
        <h1 className="text-2xl font-semibold text-[var(--text-display)]">
          Prozess &amp; Aufbau
        </h1>
      </div>

      <Card>
        {failed ? (
          // Kein stiller Leerraum: fehlt die Datei, steht hier, welche
          // erwartet wird und wohin sie gehoert.
          <p className="text-sm text-ink-dim">
            Noch keine Grafik hinterlegt. Erwartet wird{' '}
            <code className="rounded bg-muted px-1">public/assets/documentation.svg</code> —
            nach dem Ablegen erscheint sie hier automatisch.
          </p>
        ) : (
          <img
            src={DOC_SVG}
            alt="Dokumentation des Prozesses"
            onError={() => setFailed(true)}
            className="h-auto w-full"
          />
        )}
      </Card>
    </div>
  );
}
