import { Search, SlidersHorizontal, X } from "lucide-react";

import {
  Button,
  Checkbox,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui";
import { BUTTON_SIZE, BUTTON_VARIANT } from "@/shared/ui/button";

import {
  STUDENT_STATUS,
  type StudentStatus,
  getStudentStatusFilterLabel,
} from "../model/student-status-filter";

type StudentsFiltersProps = {
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onClearStatusFilter: () => void;
  onSearchInputChange: (value: string) => void;
  onStatusCheckedChange: (status: StudentStatus, checked: boolean) => void;
  searchInput: string;
  selectedStatuses: StudentStatus[];
};

export function StudentsFilters({
  hasActiveFilters,
  onClearFilters,
  onClearStatusFilter,
  onSearchInputChange,
  onStatusCheckedChange,
  searchInput,
  selectedStatuses,
}: StudentsFiltersProps) {
  const statusLabel = getStudentStatusFilterLabel(selectedStatuses);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pr-10 pl-9"
            onChange={(event) => {
              onSearchInputChange(event.target.value);
            }}
            placeholder="Поиск учеников..."
            value={searchInput}
          />
          {searchInput ? (
            <button
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
              onClick={() => {
                onSearchInputChange("");
              }}
              type="button"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button size={BUTTON_SIZE.SM} variant={BUTTON_VARIANT.OUTLINE}>
                <SlidersHorizontal className="size-4" />
                Фильтр
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-foreground text-sm font-semibold">
                    Статус
                  </p>
                </div>

                <label className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedStatuses.includes(STUDENT_STATUS.ACTIVE)}
                      onCheckedChange={(checked) => {
                        onStatusCheckedChange(
                          STUDENT_STATUS.ACTIVE,
                          checked === true,
                        );
                      }}
                    />
                    <span>Активные</span>
                  </span>
                </label>

                <label className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedStatuses.includes(
                        STUDENT_STATUS.ARCHIVED,
                      )}
                      onCheckedChange={(checked) => {
                        onStatusCheckedChange(
                          STUDENT_STATUS.ARCHIVED,
                          checked === true,
                        );
                      }}
                    />
                    <span>В архиве</span>
                  </span>
                </label>
              </div>
            </PopoverContent>
          </Popover>

          {statusLabel ? (
            <button
              className="border-border bg-surface-subtle text-foreground inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm"
              onClick={onClearStatusFilter}
              type="button"
            >
              <span>Статус: {statusLabel}</span>
              <X className="size-3.5" />
            </button>
          ) : null}

          {hasActiveFilters ? (
            <button
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              onClick={onClearFilters}
              type="button"
            >
              Сбросить фильтры
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
