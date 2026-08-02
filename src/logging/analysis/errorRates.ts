import { EventType } from '../events.ts';
import type { ScreenId } from '../events.ts';
import type { DecodedLog } from './types.ts';

export interface ScreenErrorRate {
  screen: ScreenId;
  visits: number;
  validationFailures: number;
  exceptions: number;
  errorBoundaryTrips: number;
}

export function computeErrorRates(logs: readonly DecodedLog[]): ScreenErrorRate[] {
  const map = new Map<number, ScreenErrorRate>();
  const get = (sc: number): ScreenErrorRate => {
    let v = map.get(sc);
    if (!v) {
      v = { screen: sc as ScreenId, visits: 0, validationFailures: 0, exceptions: 0, errorBoundaryTrips: 0 };
      map.set(sc, v);
    }
    return v;
  };
  for (const log of logs) {
    for (const e of log.events) {
      const summary = get(e.sc);
      if (e.ty === EventType.ROUTE_ENTER) summary.visits += 1;
      if (e.ty === EventType.FIELD_VALIDATION_FAIL) summary.validationFailures += 1;
      if (e.ty === EventType.EXCEPTION_CAUGHT) summary.exceptions += 1;
      if (e.ty === EventType.ERROR_BOUNDARY_TRIP) summary.errorBoundaryTrips += 1;
    }
  }
  return [...map.values()];
}
