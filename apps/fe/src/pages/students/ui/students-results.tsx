import {
  type PaginationState,
  type SortingState,
  createColumnHelper,
  flexRender,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
} from "lucide-react";
import type { MouseEventHandler } from "react";

import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui";
import { BUTTON_SIZE, BUTTON_VARIANT } from "@/shared/ui/button";

import type { StudentListItem } from "../model/api-types";
import {
  formatAnalyzedGames,
  formatLastAnalysis,
  formatRating,
  formatWeaknessTag,
} from "../model/formatters";

import {
  StudentIdentityLink,
  StudentMobileCard,
  StudentStatusBadge,
} from "./student-list-item";

const pageSizeOptions = ["10", "20", "50"];
const studentsTableFeatures = tableFeatures({
  rowPaginationFeature,
  rowSortingFeature,
});
const studentColumnHelper = createColumnHelper<
  typeof studentsTableFeatures,
  StudentListItem
>();
const studentColumns = studentColumnHelper.columns([
  studentColumnHelper.accessor("displayName", {
    header: "Ученик",
    cell: ({ row }) => <StudentIdentityLink student={row.original} />,
  }),
  studentColumnHelper.accessor("rating", {
    header: ({ column }) => (
      <SortableHeader
        canSort={column.getCanSort()}
        isSorted={column.getIsSorted()}
        label="Рейтинг"
        onClick={column.getToggleSortingHandler()}
      />
    ),
    cell: ({ row }) => formatRating(row.original.rating),
  }),
  studentColumnHelper.accessor("completedAnalysisCount", {
    header: ({ column }) => (
      <SortableHeader
        canSort={column.getCanSort()}
        isSorted={column.getIsSorted()}
        label="Партии с анализом"
        onClick={column.getToggleSortingHandler()}
      />
    ),
    cell: ({ row }) => formatAnalyzedGames(row.original.completedAnalysisCount),
  }),
  studentColumnHelper.accessor("mainWeaknessTag", {
    header: "Главная слабость",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatWeaknessTag(row.original.mainWeaknessTag)}
      </span>
    ),
  }),
  studentColumnHelper.accessor("lastAnalysisAt", {
    header: ({ column }) => (
      <SortableHeader
        canSort={column.getCanSort()}
        isSorted={column.getIsSorted()}
        label="Последний анализ"
        onClick={column.getToggleSortingHandler()}
      />
    ),
    cell: ({ row }) => formatLastAnalysis(row.original.lastAnalysisAt),
  }),
  studentColumnHelper.accessor("archivedAt", {
    header: "Статус",
    cell: ({ row }) => (
      <StudentStatusBadge
        archivedAt={row.original.archivedAt}
        className="min-w-[4.5rem] justify-center"
      />
    ),
  }),
]);

function SortableHeader({
  canSort,
  isSorted,
  label,
  onClick,
}: {
  canSort: boolean;
  isSorted: false | "asc" | "desc";
  label: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}) {
  if (!canSort || !onClick) {
    return <span>{label}</span>;
  }

  return (
    <button
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
      onClick={onClick}
      type="button"
    >
      <span>{label}</span>
      {isSorted ? (
        <ChevronDown
          className={isSorted === "asc" ? "size-3 rotate-180" : "size-3"}
        />
      ) : (
        <ChevronsUpDown className="size-3" />
      )}
    </button>
  );
}

type StudentsResultsProps = {
  canNextPage: boolean;
  canPreviousPage: boolean;
  isFetching: boolean;
  limit: number;
  onNextPage: () => void;
  onPageSizeChange: (pageSize: number) => void;
  onPaginationChange: (
    updater:
      | PaginationState
      | ((currentPagination: PaginationState) => PaginationState),
  ) => void;
  onPreviousPage: () => void;
  onSortingChange: (
    updater: SortingState | ((old: SortingState) => SortingState),
  ) => void;
  pagination: PaginationState;
  sorting: SortingState;
  students: StudentListItem[];
  total: number;
};

export function StudentsResults({
  canNextPage,
  canPreviousPage,
  isFetching,
  limit,
  onNextPage,
  onPageSizeChange,
  onPaginationChange,
  onPreviousPage,
  onSortingChange,
  pagination,
  sorting,
  students,
  total,
}: StudentsResultsProps) {
  const table = useTable({
    columns: studentColumns,
    data: students,
    features: studentsTableFeatures,
    manualPagination: true,
    manualSorting: true,
    onPaginationChange,
    onSortingChange,
    rowCount: total,
    state: {
      pagination,
      sorting,
    },
  });
  const page = pagination.pageIndex + 1;
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd =
    total === 0 ? 0 : Math.min((page - 1) * limit + students.length, total);

  return (
    <div className="border-border bg-surface overflow-hidden rounded-[28px] border shadow-[0_24px_60px_-42px_rgba(32,33,36,0.32)]">
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 p-4 md:hidden">
        {students.map((student) => (
          <StudentMobileCard key={student.id} student={student} />
        ))}
      </div>

      <div className="border-divider flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="text-muted-foreground">
          {total} {total === 1 ? "ученик" : "учеников"}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Строк на странице:</span>
            <Select
              onValueChange={(value) => {
                onPageSizeChange(Number(value));
              }}
              value={String(limit)}
            >
              <SelectTrigger className="h-9 w-[84px] rounded-xl px-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">
              {rangeStart}–{rangeEnd} из {total}
            </span>
            <div className="flex items-center gap-1">
              <Button
                disabled={!canPreviousPage}
                onClick={onPreviousPage}
                size={BUTTON_SIZE.ICON}
                variant={BUTTON_VARIANT.GHOST}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                disabled={!canNextPage}
                onClick={onNextPage}
                size={BUTTON_SIZE.ICON}
                variant={BUTTON_VARIANT.GHOST}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isFetching ? (
        <div className="text-muted-foreground border-divider border-t px-4 py-2 text-xs">
          Обновляем список учеников...
        </div>
      ) : null}
    </div>
  );
}
