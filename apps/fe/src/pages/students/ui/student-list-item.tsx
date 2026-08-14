import { Link } from "@tanstack/react-router";

import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui";

import type { StudentListItem } from "../model/api-types";
import {
  formatAnalyzedGames,
  formatLastAnalysis,
  formatRating,
  formatStatusLabel,
  formatStudentInitials,
  formatWeaknessTag,
} from "../model/formatters";

export function StudentStatusBadge({
  archivedAt,
  className,
}: {
  archivedAt: StudentListItem["archivedAt"];
  className?: string;
}) {
  return (
    <Badge
      variant={archivedAt ? "outline" : "success"}
      className={cn(className)}
    >
      {formatStatusLabel(archivedAt)}
    </Badge>
  );
}

export function StudentIdentityLink({
  student,
  className,
}: {
  student: StudentListItem;
  className?: string;
}) {
  return (
    <Link
      className={cn(
        "group focus-visible:ring-accent/40 focus-visible:ring-offset-background flex items-center gap-3 rounded-2xl focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        className,
      )}
      to="/students/$studentId"
      params={{
        studentId: student.id,
      }}
    >
      <div className="bg-surface-subtle text-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
        {formatStudentInitials(student.displayName)}
      </div>
      <div className="min-w-0">
        <p className="group-hover:text-accent truncate font-medium transition-colors">
          {student.displayName}
        </p>
      </div>
    </Link>
  );
}

export function StudentMobileCard({ student }: { student: StudentListItem }) {
  return (
    <Link
      className="border-border bg-surface hover:bg-surface-subtle/45 focus-visible:ring-accent/40 focus-visible:ring-offset-background flex w-full flex-col gap-3 rounded-[24px] border p-4 text-left transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      to="/students/$studentId"
      params={{
        studentId: student.id,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="bg-surface-subtle text-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            {formatStudentInitials(student.displayName)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {student.displayName}
            </p>
            <p className="text-muted-foreground text-xs">
              Рейтинг {formatRating(student.rating)} •{" "}
              {formatAnalyzedGames(student.completedAnalysisCount)} партий
              проанализировано
            </p>
          </div>
        </div>
        <StudentStatusBadge archivedAt={student.archivedAt} />
      </div>

      <p className="text-muted-foreground text-xs">
        {formatWeaknessTag(student.mainWeaknessTag)} •{" "}
        {formatLastAnalysis(student.lastAnalysisAt)}
      </p>
    </Link>
  );
}
