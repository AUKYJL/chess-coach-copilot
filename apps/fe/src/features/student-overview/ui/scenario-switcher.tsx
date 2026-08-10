import type { StudentOverviewScenarioId } from "../model/types";

type ScenarioSwitcherProps = {
  scenarioId: StudentOverviewScenarioId;
  onScenarioChange: (scenarioId: StudentOverviewScenarioId) => void;
  options: Array<{
    id: StudentOverviewScenarioId;
    label: string;
  }>;
};

export function ScenarioSwitcher({
  scenarioId,
  onScenarioChange,
  options,
}: ScenarioSwitcherProps) {
  return (
    <div className="border-border bg-surface-card inline-flex items-center gap-3 rounded-2xl border px-4 py-3">
      <label
        htmlFor="student-overview-scenario"
        className="text-muted-foreground text-xs font-semibold tracking-[0.2em] uppercase"
      >
        Scenario
      </label>
      <select
        id="student-overview-scenario"
        aria-label="Scenario"
        className="border-border bg-surface text-foreground focus:border-accent focus:ring-accent/25 rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2"
        value={scenarioId}
        onChange={(event) =>
          onScenarioChange(event.currentTarget.value as StudentOverviewScenarioId)
        }
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
