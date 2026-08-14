import { useQueryClient } from "@tanstack/react-query";
import { type PaginationState, type SortingState } from "@tanstack/react-table";
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
import {
  DEFAULT_STUDENTS_PAGE_SIZE,
  type StudentsRouteSearch,
} from "./students-route-search";
import { getStudentsSortField } from "./students-sort";

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

type UseStudentsPageDataOptions = {
  search: StudentsRouteSearch;
  setSearch: (
    updater:
      | StudentsRouteSearch
      | ((currentSearch: StudentsRouteSearch) => StudentsRouteSearch),
  ) => Promise<void>;
};

export function useStudentsPageData({
  search: routeSearch,
  setSearch,
}: UseStudentsPageDataOptions) {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState(routeSearch.search);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(
    null,
  );
  const search = routeSearch.search.trim();
  const selectedStatuses = routeSearch.statuses;
  const sorting: SortingState = routeSearch.sort
    ? [
        {
          id: routeSearch.sort,
          desc: routeSearch.order === "desc",
        },
      ]
    : [];
  const pagination = {
    pageIndex: routeSearch.page - 1,
    pageSize: routeSearch.limit,
  } satisfies PaginationState;

  function updateSearch(
    updater:
      | StudentsRouteSearch
      | ((currentSearch: StudentsRouteSearch) => StudentsRouteSearch),
  ) {
    return setSearch(updater);
  }

  useEffect(() => {
    setSearchInput(routeSearch.search);
  }, [routeSearch.search]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const trimmedValue = searchInput.trim();

      if (trimmedValue === search) {
        return;
      }

      setSearch((currentSearch) => ({
        ...currentSearch,
        search: trimmedValue,
        page: 1,
      })).catch((error) => {
        const normalizedError =
          error instanceof Error
            ? error
            : new Error("Students search update failed.");

        console.error("Students search update failed.", normalizedError);
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [search, searchInput, setSearch]);

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
          page: routeSearch.page,
          limit: pagination.pageSize,
        },
      },
    }),
    [order, pagination.pageSize, routeSearch.page, search, sort, statuses],
  );
  const studentsListQueryKey = $api.queryOptions(
    "get",
    "/api/students",
  ).queryKey;
  const studentsQuery = $api.useQuery(
    "get",
    "/api/students",
    studentsQueryParams,
    {
      enabled: hasSelectedStatuses,
      placeholderData: (previousData) => previousData,
    },
  );
  const createStudentMutation = $api.useMutation("post", "/api/students");

  async function invalidateStudentsQueries() {
    await queryClient.invalidateQueries({
      queryKey: studentsListQueryKey,
    });
  }

  function setSorting(
    updater: SortingState | ((old: SortingState) => SortingState),
  ) {
    const nextSorting =
      typeof updater === "function" ? updater(sorting) : updater;
    const nextSort = getStudentsSortField(nextSorting[0]?.id);

    updateSearch((currentSearch) => ({
      ...currentSearch,
      sort: nextSort,
      order: nextSort ? (nextSorting[0]?.desc ? "desc" : "asc") : undefined,
      page: 1,
    })).catch((error) => {
      const normalizedError =
        error instanceof Error
          ? error
          : new Error("Students sorting update failed.");

      console.error("Students sorting update failed.", normalizedError);
    });
  }

  function setPagination(
    updater:
      | PaginationState
      | ((currentPagination: PaginationState) => PaginationState),
  ) {
    const nextPagination =
      typeof updater === "function" ? updater(pagination) : updater;
    const nextLimit = nextPagination.pageSize;
    const nextPage = nextPagination.pageIndex + 1;

    updateSearch((currentSearch) => ({
      ...currentSearch,
      limit: nextLimit,
      page: nextLimit === currentSearch.limit ? nextPage : 1,
    })).catch((error) => {
      const normalizedError =
        error instanceof Error
          ? error
          : new Error("Students pagination update failed.");

      console.error("Students pagination update failed.", normalizedError);
    });
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
    students: hasSelectedStatuses ? (studentsQuery.data?.items ?? []) : [],
    total: hasSelectedStatuses ? (studentsQuery.data?.total ?? 0) : 0,
    page: hasSelectedStatuses
      ? (studentsQuery.data?.page ?? routeSearch.page)
      : routeSearch.page,
    limit: hasSelectedStatuses
      ? (studentsQuery.data?.limit ?? pagination.pageSize)
      : pagination.pageSize,
    totalPages: hasSelectedStatuses ? (studentsQuery.data?.totalPages ?? 0) : 0,
    isInitialLoading:
      hasSelectedStatuses && studentsQuery.isPending && !studentsQuery.data,
    isFetching: hasSelectedStatuses && studentsQuery.isFetching,
    isError:
      hasSelectedStatuses && studentsQuery.isError && !studentsQuery.data,
    errorMessage:
      hasSelectedStatuses && studentsQuery.isError && !studentsQuery.data
        ? getErrorMessage(
            studentsQuery.error,
            "Сейчас не удалось загрузить учеников.",
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
      updateSearch({
        search: "",
        statuses: DEFAULT_STUDENT_STATUSES,
        sort: undefined,
        order: undefined,
        page: 1,
        limit: routeSearch.limit || DEFAULT_STUDENTS_PAGE_SIZE,
      }).catch((error) => {
        const normalizedError =
          error instanceof Error
            ? error
            : new Error("Students filter reset failed.");

        console.error("Students filter reset failed.", normalizedError);
      });
    },
    clearStatusFilters: () => {
      updateSearch((currentSearch) => ({
        ...currentSearch,
        statuses: DEFAULT_STUDENT_STATUSES,
        page: 1,
      })).catch((error) => {
        const normalizedError =
          error instanceof Error
            ? error
            : new Error("Students status filter reset failed.");

        console.error("Students status filter reset failed.", normalizedError);
      });
    },
    onStatusCheckedChange: (status: StudentStatus, checked: boolean) => {
      updateSearch((currentSearch) => ({
        ...currentSearch,
        statuses: setStudentStatusChecked({
          checked,
          selectedStatuses: currentSearch.statuses,
          status,
        }),
        page: 1,
      })).catch((error) => {
        const normalizedError =
          error instanceof Error
            ? error
            : new Error("Students status filter update failed.");

        console.error("Students status filter update failed.", normalizedError);
      });
    },
    onSortingChange: (
      updater: SortingState | ((old: SortingState) => SortingState),
    ) => {
      setSorting(updater);
    },
    onPageSizeChange: (pageSize: number) => {
      updateSearch((currentSearch) => ({
        ...currentSearch,
        limit: pageSize,
        page: 1,
      })).catch((error) => {
        const normalizedError =
          error instanceof Error
            ? error
            : new Error("Students page size update failed.");

        console.error("Students page size update failed.", normalizedError);
      });
    },
    onPreviousPage: () => {
      updateSearch((currentSearch) => ({
        ...currentSearch,
        page: Math.max(currentSearch.page - 1, 1),
      })).catch((error) => {
        const normalizedError =
          error instanceof Error
            ? error
            : new Error("Students previous page navigation failed.");

        console.error(
          "Students previous page navigation failed.",
          normalizedError,
        );
      });
    },
    onNextPage: () => {
      updateSearch((currentSearch) => ({
        ...currentSearch,
        page:
          studentsQuery.data?.totalPages && studentsQuery.data.totalPages > 0
            ? Math.min(currentSearch.page + 1, studentsQuery.data.totalPages)
            : currentSearch.page,
      })).catch((error) => {
        const normalizedError =
          error instanceof Error
            ? error
            : new Error("Students next page navigation failed.");

        console.error("Students next page navigation failed.", normalizedError);
      });
    },
    canPreviousPage: routeSearch.page > 1,
    canNextPage: (studentsQuery.data?.totalPages ?? 0) > routeSearch.page,
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
          getErrorMessage(error, "Сейчас не удалось добавить ученика."),
        );
        throw error;
      }
    },
  };
}
