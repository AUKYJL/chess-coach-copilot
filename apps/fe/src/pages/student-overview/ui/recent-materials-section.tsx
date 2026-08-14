import { ArrowRight } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui";
import { BUTTON_SIZE, BUTTON_VARIANT, Button } from "@/shared/ui/button";

import type { MaterialRowViewModel } from "../model";

type RecentMaterialsSectionProps = {
  materials: MaterialRowViewModel[];
};

export function RecentMaterialsSection({
  materials,
}: RecentMaterialsSectionProps) {
  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex items-center justify-between gap-4">
          <CardTitle>Последние материалы</CardTitle>
          <Button variant={BUTTON_VARIANT.GHOST} size={BUTTON_SIZE.SM} disabled>
            Все материалы
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {materials.length > 0 ? (
          materials.map((material) => (
            <div
              key={material.id}
              className="border-border bg-surface-card rounded-[22px] border px-4 py-4"
            >
              <span className="bg-surface text-muted-foreground inline-flex rounded-full px-2.5 py-1 text-xs font-semibold">
                {material.kind}
              </span>
              <p className="text-foreground mt-4 text-base leading-6 font-semibold">
                {material.title}
              </p>
              <Typography
                className="mt-3"
                color={TYPOGRAPHY_COLOR.SECONDARY}
                variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
              >
                {material.supportingText}
              </Typography>
            </div>
          ))
        ) : (
          <div className="border-border bg-surface-card rounded-[22px] border px-4 py-4 md:col-span-2 xl:col-span-3">
            <p className="text-foreground text-sm font-semibold">
              Пока нет последних материалов
            </p>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              Отчёты и домашние задания появятся здесь после подготовки первого
              разобранного урока.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
