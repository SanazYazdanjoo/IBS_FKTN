/**
 * Hidden-behind-a-flag panel: live events, buffer fill, drop count, current
 * file size. The flag is read once per mount from localStorage
 * ('ibs-log-devpanel') — LoggingSettings.tsx is the only writer.
 */
import { useEffect, useState } from 'react';
import { useLogger } from './react.tsx';
import { EVENT_TYPE_DICT, SCREEN_DICT } from './events.ts';
import type { LoggerStats } from './logger.ts';
import type { Envelope } from './schema.ts';

export function DevPanel() {
  const logger = useLogger();
  const [stats, setStats] = useState<LoggerStats | null>(null);
  const [recent, setRecent] = useState<readonly Envelope[]>([]);
  const [sinkBytes, setSinkBytes] = useState<number | null>(null);
  const [enabled] = useState(() => localStorage.getItem('ibs-log-devpanel') === '1');

  useEffect(() => {
    if (!enabled || !logger) return undefined;
    const id = setInterval(() => {
      setStats(logger.getStats());
      setRecent(logger.getRecent());
      void logger
        .getSink()
        .sizeBytes()
        .then(setSinkBytes)
        .catch(() => setSinkBytes(null));
    }, 1000);
    return () => clearInterval(id);
  }, [enabled, logger]);

  if (!enabled || !logger) return null;

  return (
    <div className="fixed bottom-2 right-2 z-50 w-80 rounded-lg border border-line bg-surface/95 p-3 text-xs shadow-lg backdrop-blur">
      <p className="font-semibold uppercase tracking-label text-ink-dim">Log-Panel (dev)</p>
      {stats && (
        <ul className="mt-1 space-y-0.5">
          <li>Puffer: {stats.bufferLength}</li>
          <li>Verworfen: {stats.dropCount}</li>
          <li>Sink-Fehler: {stats.sinkFailures}</li>
          <li>Letzter Flush: {stats.lastFlushAt ? new Date(stats.lastFlushAt).toLocaleTimeString() : '—'}</li>
          <li>Geschrieben (Sitzung): {stats.sizeBytesEstimate} B</li>
          <li>Sink-Größe: {sinkBytes ?? '—'} B</li>
        </ul>
      )}
      <p className="mt-2 font-semibold uppercase tracking-label text-ink-dim">Letzte Ereignisse</p>
      <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto font-mono">
        {[...recent].reverse().map((e, i) => (
          <li key={i}>
            {EVENT_TYPE_DICT[e.ty]?.name ?? e.ty} · {SCREEN_DICT[e.sc]?.name ?? e.sc}
            {e.a ? ` ${JSON.stringify(e.a)}` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}
