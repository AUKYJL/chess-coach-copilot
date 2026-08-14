import { AlertTriangle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui";
import { BUTTON_VARIANT, Button } from "@/shared/ui/button";

type SectionErrorStateProps = {
  title: string;
  description: string;
  onRetry: () => Promise<void>;
};

export function SectionErrorState({
  title,
  description,
  onRetry,
}: SectionErrorStateProps) {
  return (
    <Card className="border-danger/15 h-full">
      <CardHeader className="gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-danger size-4" />
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm leading-6">{description}</p>
        <Button
          variant={BUTTON_VARIANT.OUTLINE}
          onClick={async () => {
            await onRetry();
          }}
        >
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}
