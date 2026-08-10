import type { StudentHeaderViewModel } from "../model/types";

import { StudentActions } from "./student-actions";

type StudentHeaderProps = {
  student: StudentHeaderViewModel;
  onAnalyzeGame: () => void;
  onEditStudent: () => void;
  onToggleArchived: () => void;
};

export function StudentHeader({
  student,
  onAnalyzeGame,
  onEditStudent,
  onToggleArchived,
}: StudentHeaderProps) {
  const metadata = [student.ratingLabel, student.birthYearLabel].filter(Boolean);

  return (
    <header className="border-border bg-surface rounded-[32px] border px-6 py-6 shadow-[0_24px_60px_-42px_rgba(32,33,36,0.32)] md:px-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="bg-avatar text-avatar-foreground flex size-[4.5rem] shrink-0 items-center justify-center rounded-full text-xl font-semibold">
            {student.initials}
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs font-semibold tracking-[0.22em] uppercase">
              {student.breadcrumbLabel}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-foreground text-3xl font-semibold tracking-tight md:text-[2.6rem]">
                {student.displayName}
              </h1>
              <span
                className={
                  student.isArchived
                    ? "bg-surface-subtle text-muted-foreground rounded-full px-3 py-1 text-xs font-semibold"
                    : "bg-info-soft text-accent rounded-full px-3 py-1 text-xs font-semibold"
                }
              >
                {student.statusLabel}
              </span>
            </div>
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              {metadata.map((item, index) => (
                <span key={item} className="flex items-center gap-3">
                  {index > 0 ? <span className="bg-divider size-1 rounded-full" /> : null}
                  <span>{item}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <StudentActions
          isArchived={student.isArchived}
          onAnalyzeGame={onAnalyzeGame}
          onEditStudent={onEditStudent}
          onToggleArchived={onToggleArchived}
        />
      </div>
    </header>
  );
}
