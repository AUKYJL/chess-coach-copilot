import { useQueryClient } from "@tanstack/react-query";
import {
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";

import { $api } from "@/shared/api";

import type { CreateStudentRequest } from "./api-types";
import {
  DEFAULT_STUDENT_STATUSES,
  type StudentStatus,
  getStudentStatusesQueryValue,
  isStudentStatusSelectionFiltered,
  setStudentStatusChecked,
} from "./student-status-filter";
import { getStudentsSortField } from "./students-sort";

const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;
type StudentsSortOrder = "asc" | "desc";

function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.length > 0
  ) {
    return error.message;
  }

  return fallback;
}

export function useStudentsPageData() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<StudentStatus[]>(
    DEFAULT_STUDENT_STATUSES,
  );
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const trimmedValue = searchInput.trim();

      setSearch((previousValue) => {
        if (previousValue === trimmedValue) {
          return previousValue;
        }

        setPagination((currentPagination) => ({
          ...currentPagination,
          pageIndex: 0,
        }));

        return trimmedValue;
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchInput]);

  const statuses = getStudentStatusesQueryValue(selectedStatuses);
  const sort = getStudentsSortField(sorting[0]?.id);
  const order: StudentsSortOrder | undefined = sort
    ? sorting[0]?.desc
      ? "desc"
      : "asc"
    : undefined;
  const hasSelectedStatuses = selectedStatuses.length > 0;
  const hasStatusFilters = isStudentStatusSelectionFiltered(selectedStatuses);
  const studentsQueryParams = useMemo(
    () => ({
      params: {
        query: {
          search: search || undefined,
          statuses,
          sort,
          order: sort ? order : undefined,
          page: pagination.pageIndex + 1,
          limit: pagination.pageSize,
        },
      },
    }),
    [order, pagination.pageIndex, pagination.pageSize, search, sort, statuses],
  );
  const studentsListQueryKey = $api.queryOptions("get", "/api/students").queryKey;
  const studentsQuery = $api.useQuery("get", "/api/students", studentsQueryParams, {
    enabled: hasSelectedStatuses,
    placeholderData: (previousData) => previousData,
  });
  const createStudentMutation = $api.useMutation("post", "/api/students");

  async function invalidateStudentsQueries() {
    await queryClient.invalidateQueries({
      queryKey: studentsListQueryKey,
    });
  }

  function resetToFirstPage() {
    setPagination((currentPagination) => ({
      ...currentPagination,
      pageIndex: 0,
    }));
  }

  return {
    searchInput,
    setSearchInput,
    selectedStatuses,
    sorting,
    setSorting,
    pagination,
    setPagination,
    isAddStudentOpen,
    setIsAddStudentOpen,
    createErrorMessage,
    clearCreateErrorMessage: () => {
      setCreateErrorMessage(null);
    },
    students: hasSelectedStatuses ? studentsQuery.data?.items ?? [] : [],
    total: hasSelectedStatuses ? studentsQuery.data?.total ?? 0 : 0,
    page: hasSelectedStatuses
      ? studentsQuery.data?.page ?? pagination.pageIndex + 1
      : pagination.pageIndex + 1,
    limit: hasSelectedStatuses
      ? studentsQuery.data?.limit ?? pagination.pageSize
      : pagination.pageSize,
    totalPages: hasSelectedStatuses ? studentsQuery.data?.totalPages ?? 0 : 0,
    isInitialLoading: hasSelectedStatuses && studentsQuery.isPending && !studentsQuery.data,
    isFetching: hasSelectedStatuses && studentsQuery.isFetching,
    isError: hasSelectedStatuses && studentsQuery.isError && !studentsQuery.data,
    errorMessage:
      hasSelectedStatuses && studentsQuery.isError && !studentsQuery.data
        ? getErrorMessage(
            studentsQuery.error,
            "Could not load students right now.",
          )
        : null,
    retry: async () => {
      if (!hasSelectedStatuses) {
        return;
      }

      await studentsQuery.refetch();
    },
    isEmptyWorkspace:
      hasSelectedStatuses &&
      !!studentsQuery.data &&
      studentsQuery.data.total === 0 &&
      search.length === 0 &&
      !hasStatusFilters,
    isNoResults:
      selectedStatuses.length === 0 ||
      (hasSelectedStatuses &&
        !!studentsQuery.data &&
        studentsQuery.data.total === 0 &&
        (search.length > 0 || hasStatusFilters)),
    hasActiveFilters: search.length > 0 || hasStatusFilters,
    clearFilters: () => {
      setSearchInput("");
      setSearch("");
      setSelectedStatuses(DEFAULT_STUDENT_STATUSES);
      setSorting([]);
      resetToFirstPage();
    },
    clearStatusFilters: () => {
      setSelectedStatuses(DEFAULT_STUDENT_STATUSES);
      resetToFirstPage();
    },
    onStatusCheckedChange: (status: StudentStatus, checked: boolean) => {
      setSelectedStatuses((previousStatuses) =>
        setStudentStatusChecked({
          checked,
          selectedStatuses: previousStatuses,
          status,
        }),
      );
      resetToFirstPage();
    },
    onSortingChange: (updater: SortingState | ((old: SortingState) => SortingState)) => {
      setSorting((previousSorting) => {
        const nextSorting =
          typeof updater === "function" ? updater(previousSorting) : updater;

        resetToFirstPage();

        return nextSorting;
      });
    },
    onPageSizeChange: (pageSize: number) => {
      setPagination({
        pageIndex: 0,
        pageSize,
      });
    },
    onPreviousPage: () => {
      setPagination((currentPagination) => ({
        ...currentPagination,
        pageIndex: Math.max(currentPagination.pageIndex - 1, 0),
      }));
    },
    onNextPage: () => {
      setPagination((currentPagination) => ({
        ...currentPagination,
        pageIndex:
          studentsQuery.data?.totalPages && studentsQuery.data.totalPages > 0
            ? Math.min(
                currentPagination.pageIndex + 1,
                studentsQuery.data.totalPages - 1,
              )
            : currentPagination.pageIndex,
      }));
    },
    canPreviousPage: pagination.pageIndex > 0,
    canNextPage:
      (studentsQuery.data?.totalPages ?? 0) > pagination.pageIndex + 1,
    isCreatingStudent: createStudentMutation.isPending,
    submitCreateStudent: async (body: CreateStudentRequest) => {
      setCreateErrorMessage(null);

      try {
        const student = await createStudentMutation.mutateAsync({
          body,
        });

        await invalidateStudentsQueries();
        setIsAddStudentOpen(false);

        return student;
      } catch (error) {
        setCreateErrorMessage(
          getErrorMessage(error, "Could not add the student right now."),
        );
        throw error;
      }
    },
  };
}
