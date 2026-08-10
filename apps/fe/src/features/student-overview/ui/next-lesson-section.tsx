import { ArrowRight, GraduationCap } from "lucide-react";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@/shared/ui";

import type { NextLessonViewModel } from "../model/types";

type NextLessonSectionProps = {
  lesson: NextLessonViewModel;
};

export function NextLessonSection({ lesson }: NextLessonSectionProps) {
  return (
    <Card className="h-full">
      <CardHeader className="gap-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="text-accent size-4" />
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.22em] uppercase">
            Next lesson
          </p>
        </div>
        <CardTitle className="text-2xl leading-tight">{lesson.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-foreground text-sm leading-7">{lesson.rationale}</p>
        {lesson.focusPoints.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {lesson.focusPoints.map((point) => (
              <li
                key={point}
                className="text-muted-foreground flex items-start gap-3"
              >
                <span className="bg-accent mt-1.5 size-1.5 shrink-0 rounded-full" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            A concrete lesson checklist will appear here when a stable pattern
            is available.
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--divider)] pt-4">
          <p className="text-muted-foreground text-sm">
            {lesson.supportingText}
          </p>
          <Button variant="ghost" size="sm" disabled>
            View analysis
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
