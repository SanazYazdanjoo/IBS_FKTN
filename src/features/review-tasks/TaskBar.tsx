/** Slim persistent task bar — review build only. Mount with key={user.role}. */
import { PrimaryButton, SecondaryButton } from '../../app/ui';
import { useTaskRunner } from './useTaskRunner';

export default function TaskBar() {
  const { task, index, total, looksDone, complete, giveUp } = useTaskRunner();

  if (!task) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-note-bg px-4 py-2">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-label text-note-ink">
          Aufgabe {index + 1} von {total} · {task.titleDe}
          {looksDone && <span className="ml-2 normal-case text-success">sieht erledigt aus</span>}
        </p>
        <p className="mt-0.5 text-sm text-ink">{task.instructionDe}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <PrimaryButton onClick={complete} logId="task-bar-fertig">
          Fertig
        </PrimaryButton>
        <SecondaryButton onClick={giveUp} logId="task-bar-stuck">
          Ich komme nicht weiter
        </SecondaryButton>
      </div>
    </div>
  );
}
