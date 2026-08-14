import { useNavigate } from "react-router-dom";

import { Button } from "@/shared/ui";
import { BUTTON_SIZE, BUTTON_VARIANT } from "@/shared/ui/button";

import { useStudentsPageData } from "./model/use-students-page-data";
import { AddStudentDialog } from "./ui/add-student-dialog";
import { StudentsFilters } from "./ui/students-filters";
import { StudentsPageHeader } from "./ui/students-page-header";
import { StudentsResults } from "./ui/students-results";
import {
  StudentsEmptyState,
  StudentsErrorState,
  StudentsLoadingState,
} from "./ui/students-states";

export function StudentsPage() {
  const navigate = useNavigate();
  const query = useStudentsPageData();

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-[32px] border border-border bg-surface px-5 py-5 shadow-[0_24px_60px_-42px_rgba(32,33,36,0.32)] sm:px-6">
        <StudentsPageHeader
          onAddStudent={() => {
            query.setIsAddStudentOpen(true);
          }}
        />
        <StudentsFilters
          hasActiveFilters={query.hasActiveFilters}
          onClearFilters={query.clearFilters}
          onClearStatusFilter={query.clearStatusFilters}
          onSearchInputChange={query.setSearchInput}
          onStatusCheckedChange={query.onStatusCheckedChange}
          searchInput={query.searchInput}
          selectedStatuses={query.selectedStatuses}
        />
      </div>

      {query.isError ? (
        <StudentsErrorState
          errorMessage={query.errorMessage ?? ""}
          onRetry={query.retry}
        />
      ) : query.isInitialLoading ? (
        <StudentsLoadingState />
      ) : query.isEmptyWorkspace ? (
        <StudentsEmptyState
          action={
            <Button
              onClick={() => {
                query.setIsAddStudentOpen(true);
              }}
              size={BUTTON_SIZE.SM}
            >
              Add student
            </Button>
          }
          description="Add your first student to start importing games and tracking their progress."
          title="No students yet"
        />
      ) : query.isNoResults ? (
        <StudentsEmptyState
          action={
            query.hasActiveFilters ? (
              <Button
                onClick={query.clearFilters}
                size={BUTTON_SIZE.SM}
                variant={BUTTON_VARIANT.OUTLINE}
              >
                Clear filters
              </Button>
            ) : null
          }
          description="Try a different search or clear your filters."
          title="No students found"
        />
      ) : (
        <StudentsResults
          canNextPage={query.canNextPage}
          canPreviousPage={query.canPreviousPage}
          isFetching={query.isFetching}
          limit={query.limit}
          onNextPage={query.onNextPage}
          onPageSizeChange={query.onPageSizeChange}
          onPaginationChange={query.setPagination}
          onPreviousPage={query.onPreviousPage}
          onSortingChange={query.onSortingChange}
          pagination={query.pagination}
          sorting={query.sorting}
          students={query.students}
          total={query.total}
        />
      )}

      <AddStudentDialog
        errorMessage={query.createErrorMessage}
        isPending={query.isCreatingStudent}
        onOpenChange={(open) => {
          query.setIsAddStudentOpen(open);
          if (!open) {
            query.clearCreateErrorMessage();
          }
        }}
        onSubmit={async (values) => {
          const student = await query.submitCreateStudent(values);

          await navigate(`/students/${student.id}`);
        }}
        open={query.isAddStudentOpen}
      />
    </div>
  );
}
