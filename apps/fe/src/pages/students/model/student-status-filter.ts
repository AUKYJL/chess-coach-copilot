export const STUDENT_STATUS = {
  ACTIVE: "active",
  ARCHIVED: "archived",
} as const;

export type StudentStatus =
  (typeof STUDENT_STATUS)[keyof typeof STUDENT_STATUS];

export const DEFAULT_STUDENT_STATUSES: StudentStatus[] = [
  STUDENT_STATUS.ACTIVE,
  STUDENT_STATUS.ARCHIVED,
];

export function areAllStudentStatusesSelected(
  selectedStatuses: StudentStatus[],
) {
  return DEFAULT_STUDENT_STATUSES.every((status) =>
    selectedStatuses.includes(status),
  );
}

export function getStudentStatusesQueryValue(
  selectedStatuses: StudentStatus[],
) {
  if (
    selectedStatuses.length === 0 ||
    areAllStudentStatusesSelected(selectedStatuses)
  ) {
    return undefined;
  }

  return selectedStatuses;
}

export function getStudentStatusFilterLabel(selectedStatuses: StudentStatus[]) {
  if (areAllStudentStatusesSelected(selectedStatuses)) {
    return null;
  }

  if (selectedStatuses.length === 0) {
    return "Нет";
  }

  if (selectedStatuses.length === 1) {
    return selectedStatuses[0] === STUDENT_STATUS.ACTIVE
      ? "Активные"
      : "В архиве";
  }

  return "Выбрано";
}

export function isStudentStatusSelectionFiltered(
  selectedStatuses: StudentStatus[],
) {
  return !areAllStudentStatusesSelected(selectedStatuses);
}

export function setStudentStatusChecked(args: {
  checked: boolean;
  selectedStatuses: StudentStatus[];
  status: StudentStatus;
}) {
  if (args.checked) {
    return DEFAULT_STUDENT_STATUSES.filter(
      (status) =>
        status === args.status || args.selectedStatuses.includes(status),
    );
  }

  return args.selectedStatuses.filter((status) => status !== args.status);
}
