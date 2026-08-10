import { AlertTriangle } from "lucide-react";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@/shared/ui";

type SectionErrorStateProps = {
  title: string;
  description: string;
  onRetry: () => void;
};

export function SectionErrorState({
  title,
  description,
  onRetry,
}: SectionErrorStateProps) {
  return (
    <Card className="h-full border-danger/15">
      <CardHeader className="gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-danger size-4" />
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm leading-6">{description}</p>
        <Button variant="outline" onClick={onRetry}>
          Retry locally
        </Button>
      </CardContent>
    </Card>
  );
}
