/**
 * React integration: provider + hooks. This is the only layer that wires
 * browser listeners (visibility, focus, clicks, …) to the Logger — the
 * Logger class itself has no DOM dependency, and the domain layer has no
 * dependency on any of this at all.
 */
import {
  cloneElement,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { EventType, bucket, DURATION_BUCKETS_MS, CHANGE_COUNT_BUCKETS } from './events.ts';
import type { ScreenId } from './events.ts';
import type { Env, Role, SourceMode } from './schema.ts';
import { Logger } from './logger.ts';
import { setActiveLogger, reportUnhandledRejection } from './activeLogger.ts';
import { IndexedDbSink } from './sinks/IndexedDbSink.ts';
import { MemorySink } from './sinks/MemorySink.ts';
import type { LogSink } from './sinks/types.ts';

export interface LoggingProviderProps {
  role: Role;
  actorId: string;
  env: Env;
  sourceMode?: SourceMode;
  appVersion: string;
  children: ReactNode;
}

const LoggerContext = createContext<Logger | null>(null);

function createDefaultSink(): LogSink {
  if (typeof indexedDB === 'undefined') return new MemorySink();
  return new IndexedDbSink();
}

/**
 * Mounts one Logger for the lifetime of its (role, actorId, env, sourceMode)
 * identity; a change to any of those (role switch, data source switch)
 * closes the old session and opens a new one, since those fields are meant
 * to be session-constant (SessionHeader).
 */
export function LoggingProvider({
  role,
  actorId,
  env,
  sourceMode,
  appVersion,
  children,
}: LoggingProviderProps) {
  const [logger, setLogger] = useState<Logger | null>(null);

  useEffect(() => {
    const instance = new Logger({ role, actorId, env, sourceMode, appVersion, sink: createDefaultSink() });
    instance.start();
    setActiveLogger(instance);
    setLogger(instance);

    const onVisibility = () =>
      instance.emit(EventType.VISIBILITY_CHANGE, undefined, {
        v: document.visibilityState === 'visible',
      });
    const onFocus = () => instance.emit(EventType.FOCUS);
    const onBlur = () => instance.emit(EventType.BLUR);
    const onOnline = () => instance.emit(EventType.ONLINE);
    const onOffline = () => instance.emit(EventType.OFFLINE);
    const onPopState = () => instance.emit(EventType.NAV_BACK_FORWARD);
    const onRejection = (e: PromiseRejectionEvent) => {
      const err = e.reason instanceof Error ? e.reason : new Error(String(e.reason));
      reportUnhandledRejection(err);
    };
    const onActivity = () => instance.recordActivity();
    const onClick = (e: MouseEvent) => {
      instance.recordActivity();
      const target = (e.target as HTMLElement | null)?.closest?.('[data-log-id]');
      const id = target?.getAttribute('data-log-id');
      if (id) instance.emit(EventType.CLICK, undefined, { id });
    };
    const onKeydown = (e: KeyboardEvent) => {
      instance.recordActivity();
      if (e.key === 'Enter') instance.emit(EventType.KEY_SUBMIT);
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('popstate', onPopState);
    window.addEventListener('unhandledrejection', onRejection);
    window.addEventListener('pointermove', onActivity, { passive: true });
    window.addEventListener('scroll', onActivity, { passive: true });
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeydown);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('unhandledrejection', onRejection);
      window.removeEventListener('pointermove', onActivity);
      window.removeEventListener('scroll', onActivity);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeydown);
      setActiveLogger(null);
      instance.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, actorId, env, sourceMode, appVersion]);

  return <LoggerContext.Provider value={logger}>{children}</LoggerContext.Provider>;
}

export function useLogger(): Logger | null {
  return useContext(LoggerContext);
}

/** Emits ROUTE_ENTER on mount / when `screen` changes, ROUTE_LEAVE with a dwell bucket on the way out. */
export function useScreenLog(screen: ScreenId): void {
  const logger = useLogger();
  const enterRef = useRef(performance.now());

  useEffect(() => {
    if (!logger) return undefined;
    enterRef.current = performance.now();
    logger.setScreen(screen);
    logger.emit(EventType.ROUTE_ENTER, screen);
    return () => {
      const dwell = performance.now() - enterRef.current;
      logger.emit(EventType.ROUTE_LEAVE, screen, { dw: bucket(dwell, DURATION_BUCKETS_MS) });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logger, screen]);
}

export interface FieldLogHandlers {
  onFocus: () => void;
  onBlur: () => void;
  onChange: () => void;
  reportValidationFail: (errorCode: string) => void;
  reportCorrection: () => void;
}

/** Field focus/blur/change instrumentation — whether a value was entered, never what. */
export function useFieldLog(fieldId: string): FieldLogHandlers {
  const logger = useLogger();
  const focusAt = useRef<number | null>(null);
  const changed = useRef(false);
  const changeCount = useRef(0);

  return useMemo<FieldLogHandlers>(
    () => ({
      onFocus: () => {
        focusAt.current = performance.now();
        changed.current = false;
        changeCount.current = 0;
        logger?.emit(EventType.FIELD_FOCUS, undefined, { f: fieldId });
      },
      onBlur: () => {
        const dwell = focusAt.current !== null ? performance.now() - focusAt.current : 0;
        if (!changed.current) {
          logger?.emit(EventType.FIELD_ABANDONED, undefined, { f: fieldId });
        } else if (changeCount.current > 0) {
          logger?.emit(EventType.FIELD_CHANGE_SUMMARY, undefined, {
            f: fieldId,
            n: bucket(changeCount.current, CHANGE_COUNT_BUCKETS),
          });
        }
        logger?.emit(EventType.FIELD_BLUR, undefined, {
          f: fieldId,
          dw: bucket(dwell, DURATION_BUCKETS_MS),
        });
        focusAt.current = null;
      },
      onChange: () => {
        changeCount.current += 1;
        if (!changed.current) {
          changed.current = true;
          const ttfi = focusAt.current !== null ? performance.now() - focusAt.current : 0;
          logger?.emit(EventType.FIELD_FIRST_CHANGE, undefined, {
            f: fieldId,
            ttfi: bucket(ttfi, DURATION_BUCKETS_MS),
          });
        }
      },
      reportValidationFail: (errorCode: string) => {
        logger?.emit(EventType.FIELD_VALIDATION_FAIL, undefined, { f: fieldId, ec: errorCode });
      },
      reportCorrection: () => {
        logger?.emit(EventType.FIELD_CORRECTION_AFTER_ERROR, undefined, { f: fieldId });
      },
    }),
    [logger, fieldId],
  );
}

interface FieldEventProps {
  onFocus?: (e: unknown) => void;
  onBlur?: (e: unknown) => void;
  onChange?: (e: unknown) => void;
}

function composeHandlers(existing: ((e: unknown) => void) | undefined, added: () => void) {
  return (e: unknown) => {
    added();
    existing?.(e);
  };
}

/** Wraps a single form-control child with field instrumentation — for call sites that'd rather not use the hook directly. */
export function LoggedField({
  fieldId,
  children,
}: {
  fieldId: string;
  children: ReactElement<FieldEventProps>;
}) {
  const handlers = useFieldLog(fieldId);
  return cloneElement(children, {
    onFocus: composeHandlers(children.props.onFocus, handlers.onFocus),
    onBlur: composeHandlers(children.props.onBlur, handlers.onBlur),
    onChange: composeHandlers(children.props.onChange, handlers.onChange),
  });
}

/** Adds a stable data-log-id to any element for the provider's global click listener to pick up. */
export function withLogId<P extends object>(id: string, element: ReactElement<P>): ReactElement<P> {
  return cloneElement(element, { 'data-log-id': id } as unknown as Partial<P>);
}
