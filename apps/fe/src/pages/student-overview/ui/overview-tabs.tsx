const workspaceTabs = [
  { label: "Overview", isActive: true },
  { label: "Games", isActive: false },
  { label: "Analysis", isActive: false },
  { label: "Materials", isActive: false },
  { label: "Progress", isActive: false },
] as const;

export function OverviewTabs() {
  return (
    <nav aria-label="Student workspace sections">
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <ol className="flex min-w-max justify-start gap-6 rounded-none border-0 bg-transparent p-0 pr-4">
          {workspaceTabs.map((tab) => (
            <li key={tab.label}>
              <span
                aria-current={tab.isActive ? "page" : undefined}
                className={
                  tab.isActive
                    ? "border-foreground text-foreground inline-flex rounded-none border-b-2 px-0 py-2.5 text-sm font-medium"
                    : "text-muted-foreground inline-flex px-0 py-2.5 text-sm"
                }
              >
                {tab.label}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}
