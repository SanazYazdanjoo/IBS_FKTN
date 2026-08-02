/**
 * Drives one role's guided task script: resolves/resumes persisted state,
 * fires the lifecycle log events (start/complete/give-up/abandon+restart),
 * polls the optional advisory predicate, and routes to the feedback screen
 * after the last task. Mount the consuming component behind `key={user.role}`
 * so a role switch gets a clean instance instead of straddling two roles.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../app/session';
import { useLogger } from '../../logging/react.tsx';
import {
  logTaskAbandoned,
  logTaskCompleted,
  logTaskGivenUp,
  logTaskStarted,
} from '../../logging/domainEvents.ts';
import type { Logger } from '../../logging/logger.ts';
import { tasksForRole, type TaskDef } from './tasks';
import { loadTaskState, saveTaskState, type PersistedTaskState } from './taskState';

export interface TaskRunnerState {
  task: TaskDef | null;
  index: number;
  total: number;
  looksDone: boolean;
  complete: () => void;
  giveUp: () => void;
}

const POLL_MS = 4000;

export function useTaskRunner(): TaskRunnerState {
  const { user, storage, month } = useSession();
  const logger = useLogger();
  const navigate = useNavigate();
  const tasks = tasksForRole(user.role);

  const [state, setState] = useState<PersistedTaskState | null>(null);
  const [looksDone, setLooksDone] = useState(false);
  const resolvedRef = useRef<{ resumedTask: TaskDef | null; resumedDurationMs: number } | null>(null);
  const loggedStartRef = useRef(false);

  // Resolve (and persist) the initial/resumed state exactly once per mount.
  useEffect(() => {
    if (tasks.length === 0 || resolvedRef.current) return;
    const existing = loadTaskState(user.role);
    if (existing && !existing.finished) {
      const abandonedTask = tasks[existing.taskIndex] ?? null;
      const durationMs = Date.now() - new Date(existing.currentStartedAt).getTime();
      const resumed: PersistedTaskState = { ...existing, currentStartedAt: new Date().toISOString() };
      saveTaskState(user.role, resumed);
      resolvedRef.current = { resumedTask: abandonedTask, resumedDurationMs: durationMs };
      setState(resumed);
    } else if (!existing) {
      const fresh: PersistedTaskState = {
        taskIndex: 0,
        currentStartedAt: new Date().toISOString(),
        finished: false,
      };
      saveTaskState(user.role, fresh);
      resolvedRef.current = { resumedTask: null, resumedDurationMs: 0 };
      setState(fresh);
    } else {
      resolvedRef.current = { resumedTask: null, resumedDurationMs: 0 };
      setState(existing);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fire the resolved start / abandon+restart log events exactly once, once the logger exists.
  useEffect(() => {
    if (!logger || !state || state.finished || loggedStartRef.current) return;
    const currentTask = tasks[state.taskIndex];
    if (!currentTask) return;
    loggedStartRef.current = true;
    const resolved = resolvedRef.current;
    if (resolved?.resumedTask) {
      logTaskAbandoned(logger, resolved.resumedTask.id, resolved.resumedDurationMs);
    }
    logTaskStarted(logger, currentTask.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logger, state]);

  const currentTask = state && !state.finished ? tasks[state.taskIndex] ?? null : null;

  // Advisory predicate poll — never gates the buttons, only surfaces a hint.
  useEffect(() => {
    setLooksDone(false);
    if (!currentTask?.checkDone) return undefined;
    let cancelled = false;
    const check = () => {
      currentTask
        .checkDone!({ storage, user, month })
        .then((ok) => {
          if (!cancelled) setLooksDone(ok);
        })
        .catch(() => {});
    };
    check();
    const id = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [currentTask, storage, user, month]);

  function advance(logFn: (logger_: Logger | null, taskId: string, durationMs: number) => void) {
    if (!state || !currentTask) return;
    const durationMs = Date.now() - new Date(state.currentStartedAt).getTime();
    logFn(logger, currentTask.id, durationMs);
    const nextIndex = state.taskIndex + 1;
    const nextTask = tasks[nextIndex];
    if (nextTask) {
      const next: PersistedTaskState = {
        taskIndex: nextIndex,
        currentStartedAt: new Date().toISOString(),
        finished: false,
      };
      saveTaskState(user.role, next);
      setState(next);
      logTaskStarted(logger, nextTask.id);
    } else {
      const done: PersistedTaskState = { ...state, finished: true };
      saveTaskState(user.role, done);
      setState(done);
      navigate('/review/feedback');
    }
  }

  return {
    task: currentTask,
    index: state?.taskIndex ?? 0,
    total: tasks.length,
    looksDone,
    complete: () => advance(logTaskCompleted),
    giveUp: () => advance(logTaskGivenUp),
  };
}
