import { EventType } from '../events.ts';
import type { DecodedLog } from './types.ts';

export interface FieldFunnel {
  fieldId: string;
  focusCount: number;
  filledCount: number;
  abandonedCount: number;
  validationFailCount: number;
}

export function computeFieldFunnels(logs: readonly DecodedLog[]): FieldFunnel[] {
  const map = new Map<string, FieldFunnel>();
  const get = (f: string): FieldFunnel => {
    let v = map.get(f);
    if (!v) {
      v = { fieldId: f, focusCount: 0, filledCount: 0, abandonedCount: 0, validationFailCount: 0 };
      map.set(f, v);
    }
    return v;
  };
  for (const log of logs) {
    for (const e of log.events) {
      const f = e.a?.f as string | undefined;
      if (!f) continue;
      if (e.ty === EventType.FIELD_FOCUS) get(f).focusCount += 1;
      if (e.ty === EventType.FIELD_FIRST_CHANGE) get(f).filledCount += 1;
      if (e.ty === EventType.FIELD_ABANDONED) get(f).abandonedCount += 1;
      if (e.ty === EventType.FIELD_VALIDATION_FAIL) get(f).validationFailCount += 1;
    }
  }
  return [...map.values()];
}

export interface FormFunnel {
  formId: string;
  attempts: number;
  successes: number;
  failures: number;
}

export function computeFormFunnels(logs: readonly DecodedLog[]): FormFunnel[] {
  const map = new Map<string, FormFunnel>();
  const get = (id: string): FormFunnel => {
    let v = map.get(id);
    if (!v) {
      v = { formId: id, attempts: 0, successes: 0, failures: 0 };
      map.set(id, v);
    }
    return v;
  };
  for (const log of logs) {
    for (const e of log.events) {
      const form = (e.a?.form as string | undefined) ?? 'unknown';
      if (e.ty === EventType.FORM_SUBMIT_ATTEMPT) get(form).attempts += 1;
      if (e.ty === EventType.FORM_SUBMIT_SUCCESS) get(form).successes += 1;
      if (e.ty === EventType.FORM_SUBMIT_FAILURE) get(form).failures += 1;
    }
  }
  return [...map.values()];
}
