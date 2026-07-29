/**
 * TN-Namen app-weit nachschlagen.
 *
 * Die TN-ID erscheint in vielen Ansichten, der volle Name ist dort aber
 * meist nicht zur Hand. Statt jede Ansicht einzeln zu verkabeln, liegt die
 * Zuordnung ID → Name zentral: einmal geladen, überall verfügbar.
 *
 * Die Namen stammen aus den Monatsdatensätzen der aktiven Quelle. Fehlt ein
 * Name, wird bewusst nichts erfunden — die Anzeige fällt auf die ID zurück.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useSession } from './session';
import { STAFF_ROLES } from '../adapters/types';

interface ParticipantNamesValue {
  names: Map<string, string>;
  /** Weitere Namen ergänzen, z. B. aus einer Ansicht, die sie ohnehin lädt. */
  register: (entries: Map<string, string> | Record<string, string>) => void;
}

const ParticipantNamesContext = createContext<ParticipantNamesValue | null>(null);

export function ParticipantNamesProvider({ children }: { children: ReactNode }) {
  const { user, storage, storageVersion, month } = useSession();
  const [names, setNames] = useState<Map<string, string>>(new Map());

  const register = useCallback(
    (entries: Map<string, string> | Record<string, string>) => {
      const pairs =
        entries instanceof Map ? [...entries.entries()] : Object.entries(entries);
      if (pairs.length === 0) return;
      setNames((prev) => {
        let changed = false;
        const next = new Map(prev);
        for (const [id, name] of pairs) {
          const key = id.toUpperCase();
          if (name && next.get(key) !== name) {
            next.set(key, name);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    },
    [],
  );

  useEffect(() => {
    // TN sehen ohnehin nur sich selbst; das Verzeichnis waere dort sinnlos.
    if (!STAFF_ROLES.includes(user.role)) return;
    let cancelled = false;
    (async () => {
      try {
        const records = await storage.listMonthRecords(user, month);
        if (cancelled) return;
        register(
          new Map(
            records
              .filter((r) => r.participantName)
              .map((r) => [r.participantId, r.participantName]),
          ),
        );
      } catch {
        // Ohne Namen bleibt die ID stehen — kein Grund, etwas zu melden.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, storage, storageVersion, month, register]);

  const value = useMemo(() => ({ names, register }), [names, register]);
  return (
    <ParticipantNamesContext.Provider value={value}>
      {children}
    </ParticipantNamesContext.Provider>
  );
}

/** Voller Name oder null. Bewusst kein Fallback auf die ID. */
export function useParticipantName(id: string): string | null {
  const ctx = useContext(ParticipantNamesContext);
  return ctx?.names.get(id.toUpperCase()) ?? null;
}

export function useRegisterParticipantNames() {
  const ctx = useContext(ParticipantNamesContext);
  return ctx?.register ?? (() => {});
}
