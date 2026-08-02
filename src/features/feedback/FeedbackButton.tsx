/** Feedback control — reachable from every screen (review build only). */
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useSession } from '../../app/session';
import { APP_VERSION, GIT_SHA } from '../../app/reviewBuild';
import { screenForPath, SCREEN_DICT } from '../../logging/events.ts';
import { loadTaskState } from '../review-tasks/taskState';
import { tasksForRole } from '../review-tasks/tasks';
import {
  addFeedbackEntry,
  SEVERITY_LABELS,
  type FeedbackSeverity,
} from './feedbackStore';

function currentTaskId(role: ReturnType<typeof useSession>['user']['role']): string | undefined {
  const state = loadTaskState(role);
  if (!state || state.finished) return undefined;
  return tasksForRole(role)[state.taskIndex]?.id;
}

/** Elements the "worum geht es" picker offers — anything already carrying the click-log id. */
function pickableTargets(): { id: string; label: string }[] {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-log-id]'));
  return nodes
    .filter((el) => el.offsetParent !== null || el === document.activeElement)
    .map((el) => ({
      id: el.getAttribute('data-log-id')!,
      label: (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('data-log-id')!)
        .trim()
        .slice(0, 60),
    }))
    .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i);
}

export default function FeedbackButton() {
  const { user } = useSession();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [severity, setSeverity] = useState<FeedbackSeverity>('stoert');
  const [text, setText] = useState('');
  const [target, setTarget] = useState('');
  const [targets, setTargets] = useState<{ id: string; label: string }[]>([]);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const screen = screenForPath(location.pathname);
  const screenName = SCREEN_DICT[screen]?.name ?? 'UNKNOWN';
  const taskId = currentTaskId(user.role);

  useEffect(() => {
    if (open) setTargets(pickableTargets());
  }, [open]);

  function submit() {
    if (text.trim().length === 0) return;
    addFeedbackEntry({
      id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      screen: screenName,
      role: user.role,
      taskId,
      appVersion: APP_VERSION,
      gitSha: GIT_SHA,
      severity,
      text: text.trim(),
      target: target || undefined,
    });
    setText('');
    setTarget('');
    setOpen(false);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 3000);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-600"
      >
        Feedback
      </button>

      {savedAt && (
        <div className="fixed bottom-20 right-4 z-40 rounded-lg bg-success px-3 py-2 text-sm font-semibold text-white shadow-lg">
          Danke — gespeichert.
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-card border border-line bg-surface p-5 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-label text-ink-dim">Feedback</p>
            <p className="mt-1 text-xs text-ink-dim">
              {screenName} · {user.role}
              {taskId ? ` · Aufgabe ${taskId}` : ''} · v{APP_VERSION} · {GIT_SHA}
            </p>

            <div className="mt-3 flex gap-2">
              {(Object.keys(SEVERITY_LABELS) as FeedbackSeverity[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverity(s)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                    severity === s
                      ? 'border-primary bg-primary text-white'
                      : 'border-line text-ink hover:border-primary'
                  }`}
                >
                  {SEVERITY_LABELS[s]}
                </button>
              ))}
            </div>

            {targets.length > 0 && (
              <label className="mt-3 block text-sm">
                Worum geht es? (optional)
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-line p-2 text-sm"
                >
                  <option value="">— kein bestimmtes Element —</option>
                  {targets.map((t) => (
                    <option key={t.id} value={t.label || t.id}>
                      {t.label || t.id}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="mt-3 block text-sm">
              Ihre Rückmeldung
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                autoFocus
                placeholder="Was ist Ihnen aufgefallen?"
                className="mt-1 block w-full rounded-lg border border-line p-2 text-sm"
              />
            </label>
            <p className="mt-1 text-xs text-danger">
              Bitte keine Namen von Teilnehmenden eintragen — dieses Feld wird nicht automatisch
              geprüft.
            </p>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-line bg-surface px-5 py-2 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={text.trim().length === 0}
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Absenden
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
