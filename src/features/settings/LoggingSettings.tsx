/** Einstellungen: Datenschutz & Protokoll — Ereignisprotokoll-Zustimmung, Export, Löschung. */
import { useEffect, useState } from 'react';
import { Card, Eyebrow, PrimaryButton, SecondaryButton, DangerButton } from '../../app/ui';
import { useSession } from '../../app/session';
import { useLogger } from '../../logging/react.tsx';
import { getConsentState, grantConsent, revokeConsent, type ConsentState } from '../../logging/consent.ts';
import { EventType } from '../../logging/events.ts';
import { FileDownloadSink } from '../../logging/sinks/FileDownloadSink.ts';
import { IndexedDbSink } from '../../logging/sinks/IndexedDbSink.ts';

export default function LoggingSettings() {
  const { dataSource } = useSession();
  const logger = useLogger();
  const [consent, setConsent] = useState<ConsentState>(getConsentState());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [devPanelOn, setDevPanelOn] = useState(() => localStorage.getItem('ibs-log-devpanel') === '1');

  const effectiveOn = consent === 'granted' || (consent === 'unset' && dataSource.kind === 'MOCK');

  const onGrant = () => {
    grantConsent();
    setConsent('granted');
    logger?.emit(EventType.CONSENT_GRANTED);
    setMessage('Protokollierung aktiviert.');
  };

  const onRevoke = async () => {
    setBusy(true);
    try {
      revokeConsent();
      setConsent('revoked');
      logger?.emit(EventType.CONSENT_REVOKED);
      await IndexedDbSink.clearAll();
      setMessage('Protokollierung deaktiviert, vorhandene Daten gelöscht.');
    } finally {
      setBusy(false);
    }
  };

  const onExport = async () => {
    setBusy(true);
    try {
      const sink = logger?.getSink();
      const text = (await sink?.readAllNdjson?.()) ?? '';
      const download = new FileDownloadSink();
      await download.append(text ? text.split('\n').slice(1) : []);
      const header = text.split('\n')[0];
      if (header) await download.init(JSON.parse(header));
      await download.downloadNow(`ereignisprotokoll_${new Date().toISOString().slice(0, 10)}.ndjson.gz`);
      logger?.emit(EventType.LOG_EXPORTED);
      setMessage('Export gestartet — Download sollte in Kürze erscheinen.');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    setBusy(true);
    try {
      await IndexedDbSink.clearAll();
      logger?.emit(EventType.LOG_DELETED);
      setMessage('Protokoll gelöscht.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('ibs-log-devpanel', devPanelOn ? '1' : '0');
  }, [devPanelOn]);

  return (
    <div className="space-y-4">
      <Eyebrow>Einstellungen · Datenschutz & Protokoll</Eyebrow>

      <Card>
        <p className="font-semibold">Ereignisprotokoll</p>
        <p className="mt-1 text-sm text-ink-dim">
          Zeichnet auf, wie die App genutzt wird (Bildschirmwechsel, Feld-Interaktionen,
          Status-Übergänge, Fehler) — als Zahlen und Kategorien, niemals als Namen,
          Adressen, IBANs oder Freitext. Details siehe <code>docs/LOGGING.md</code>.
          {dataSource.kind === 'MOCK' && consent === 'unset' && (
            <> In der Demo ist die Protokollierung standardmäßig aktiv.</>
          )}
        </p>
        <p className="mt-2 text-sm">
          Status:{' '}
          <span className={effectiveOn ? 'font-semibold text-success' : 'font-semibold text-ink-dim'}>
            {effectiveOn ? 'Aktiv' : 'Deaktiviert'}
          </span>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {!effectiveOn && <PrimaryButton onClick={onGrant}>Zustimmen und aktivieren</PrimaryButton>}
          {effectiveOn && (
            <SecondaryButton onClick={onRevoke} disabled={busy}>
              Widerrufen (löscht vorhandene Daten)
            </SecondaryButton>
          )}
        </div>
      </Card>

      <Card>
        <p className="font-semibold">Eigene Daten</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <SecondaryButton onClick={onExport} disabled={busy || !effectiveOn}>
            Log exportieren
          </SecondaryButton>
          <DangerButton onClick={onDelete} disabled={busy}>
            Log löschen
          </DangerButton>
        </div>
        {message && <p className="mt-2 text-sm text-success">{message}</p>}
      </Card>

      <Card>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={devPanelOn}
            onChange={(e) => setDevPanelOn(e.target.checked)}
          />
          Entwickler-Panel anzeigen (live Ereignisse, Puffer, Dateigröße)
        </label>
      </Card>
    </div>
  );
}
