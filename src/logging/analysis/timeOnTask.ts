import { EventType, DURATION_BUCKETS_MS } from '../events.ts';
import type { ScreenId } from '../events.ts';
import type { DecodedLog } from './types.ts';

export interface ScreenTimeSummary {
  screen: ScreenId;
  visits: number;
  /** Histogram over DURATION_BUCKETS_MS, one extra slot for "over the top edge". */
  dwellBucketCounts: number[];
}

export function computeTimeOnTask(logs: readonly DecodedLog[]): ScreenTimeSummary[] {
  const map = new Map<number, ScreenTimeSummary>();
  const get = (sc: number): ScreenTimeSummary => {
    let v = map.get(sc);
    if (!v) {
      v = { screen: sc as ScreenId, visits: 0, dwellBucketCounts: new Array(DURATION_BUCKETS_MS.length + 1).fill(0) };
      map.set(sc, v);
    }
    return v;
  };
  for (const log of logs) {
    for (const e of log.events) {
      if (e.ty !== EventType.ROUTE_LEAVE) continue;
      const summary = get(e.sc);
      summary.visits += 1;
      const b = (e.a?.dw as number | undefined) ?? 0;
      summary.dwellBucketCounts[b] = (summary.dwellBucketCounts[b] ?? 0) + 1;
    }
  }
  return [...map.values()];
}
