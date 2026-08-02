/**
 * Module-level accessor for the current Logger instance. Exists so
 * non-React call sites — the class-based ErrorBoundary, a window
 * `unhandledrejection` listener — can report an event without needing a
 * hook. LoggingProvider is the only writer (setActiveLogger); everything
 * else only reads.
 */
import { EventType } from './events.ts';
import { stackHash } from './hash.ts';
import type { Logger } from './logger.ts';

let current: Logger | null = null;

export function setActiveLogger(logger: Logger | null): void {
  current = logger;
}

export function getActiveLogger(): Logger | null {
  return current;
}

export function reportErrorBoundaryTrip(error: Error, component?: string): void {
  current?.emit(EventType.ERROR_BOUNDARY_TRIP, undefined, {
    sh: stackHash(error),
    comp: component,
  });
}

export function reportUnhandledRejection(error: Error): void {
  current?.emit(EventType.UNHANDLED_REJECTION, undefined, { sh: stackHash(error) });
}

export function reportCaughtException(error: Error, errorCode?: string, component?: string): void {
  current?.emit(EventType.EXCEPTION_CAUGHT, undefined, { sh: stackHash(error), ec: errorCode, comp: component });
}
