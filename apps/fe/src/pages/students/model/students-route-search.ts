import { z } from "zod";

import {
  DEFAULT_STUDENT_STATUSES,
  STUDENT_STATUS,
} from "./student-status-filter";
import { STUDENTS_SORT_FIELD } from "./students-sort";

export const DEFAULT_STUDENTS_PAGE_SIZE = 10;

const studentStatusSchema = z.enum([
  STUDENT_STATUS.ACTIVE,
  STUDENT_STATUS.ARCHIVED,
]);

const studentsSortFieldSchema = z.enum([
  STUDENTS_SORT_FIELD.RATING,
  STUDENTS_SORT_FIELD.COMPLETED_ANALYSIS_COUNT,
  STUDENTS_SORT_FIELD.LAST_ANALYSIS_AT,
]);

export const studentsSearchSchema = z.object({
  search: z.string().catch("").default(""),
  statuses: z
    .union([z.array(studentStatusSchema), studentStatusSchema])
    .transform((value) => (Array.isArray(value) ? value : [value]))
    .catch(DEFAULT_STUDENT_STATUSES)
    .default(DEFAULT_STUDENT_STATUSES),
  sort: studentsSortFieldSchema.optional().catch(() => undefined),
  order: z.enum(["asc", "desc"]).optional().catch(() => undefined),
  page: z.coerce.number().int().positive().catch(1).default(1),
  limit: z.coerce.number().int().positive().catch(DEFAULT_STUDENTS_PAGE_SIZE).default(
    DEFAULT_STUDENTS_PAGE_SIZE,
  ),
});

export type StudentsRouteSearch = z.infer<typeof studentsSearchSchema>;
