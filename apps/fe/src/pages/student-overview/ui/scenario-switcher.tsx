import type { StudentOverviewScenarioId } from "../model";

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
  function handleScenarioChange(value: string) {
    const nextScenario = options.find((option) => option.id === value);

    if (nextScenario) {
      onScenarioChange(nextScenario.id);
    }
  }

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
        onChange={(event) => handleScenarioChange(event.currentTarget.value)}
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
