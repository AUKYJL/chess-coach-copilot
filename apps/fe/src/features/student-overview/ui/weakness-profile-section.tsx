import { ArrowRight, ShieldAlert } from "lucide-react";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui";

import { toneChipClasses } from "../model/semantic-tones";
import type { WeaknessProfileViewModel } from "../model/types";

type WeaknessProfileSectionProps = {
  profile: WeaknessProfileViewModel;
};

export function WeaknessProfileSection({
  profile,
}: WeaknessProfileSectionProps) {
  if (profile.tagCounts.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-accent size-4" />
            <CardTitle>Weakness profile</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-foreground text-sm leading-7">
            There is not enough reviewed analysis yet to describe a reliable
            weakness pattern.
          </p>
          <Typography
            color={TYPOGRAPHY_COLOR.SECONDARY}
            variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
          >
            Add more annotated games or retry the local review state.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...profile.tagCounts.map((item) => item.count), 1);

  return (
    <Card className="h-full">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldAlert className="text-accent size-4" />
              <CardTitle>Weakness profile</CardTitle>
            </div>
            <Typography
              color={TYPOGRAPHY_COLOR.SECONDARY}
              variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
            >
              Main pattern: {profile.mainWeakness}
            </Typography>
          </div>
          <Button variant="ghost" size="sm" className="shrink-0" disabled>
            Full analysis
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {profile.tagCounts.map((item) => (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-foreground">{item.label}</span>
                <span className="text-muted-foreground">{item.count}</span>
              </div>
              <div className="bg-surface-subtle h-2 rounded-full">
                <div
                  className="bg-accent h-2 rounded-full"
                  style={{ width: `${(item.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {profile.severitySummary.map((item) => (
            <span
              key={item.label}
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${toneChipClasses[item.tone]}`}
            >
              {item.count} {item.label}
            </span>
          ))}
        </div>

        {profile.sampleInsight ? (
          <div className="bg-surface-card rounded-[20px] px-4 py-4">
            <p className="text-foreground text-sm leading-6">
              {profile.sampleInsight}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
