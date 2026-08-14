import { AlertTriangle } from "lucide-react";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@/shared/ui";

type OverviewErrorStateProps = {
  description: string;
  onRetry: () => Promise<void>;
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
          <CardTitle>Не удалось загрузить карточку ученика</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm leading-6">{description}</p>
        <Button
          onClick={async () => {
            await onRetry();
          }}
        >
          Повторить
        </Button>
      </CardContent>
    </Card>
  );
}
