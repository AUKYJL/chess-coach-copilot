import { AlertTriangle } from "lucide-react";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@/shared/ui";

type OverviewErrorStateProps = {
  description: string;
  onRetry: () => void;
};

export function OverviewErrorState({
  description,
  onRetry,
}: OverviewErrorStateProps) {
  return (
    <Card className="border-danger/15">
      <CardHeader className="gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-danger size-4" />
          <CardTitle>Student overview failed to load</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm leading-6">{description}</p>
        <Button onClick={onRetry}>Retry locally</Button>
      </CardContent>
    </Card>
  );
}
