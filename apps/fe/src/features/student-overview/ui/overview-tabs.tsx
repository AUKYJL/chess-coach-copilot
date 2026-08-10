import { Tabs, TabsList, TabsTrigger } from "@/shared/ui";

const workspaceTabs = [
  "Overview",
  "Games",
  "Analysis",
  "Materials",
  "Progress",
] as const;

export function OverviewTabs() {
  return (
    <Tabs defaultValue="overview">
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <TabsList className="min-w-max justify-start gap-6 rounded-none border-0 bg-transparent p-0 pr-4">
          {workspaceTabs.map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab.toLowerCase()}
              className="data-[state=active]:border-foreground rounded-none border-b-2 border-transparent px-0 py-2.5 text-sm data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </Tabs>
  );
}
