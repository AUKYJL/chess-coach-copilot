import type { paths } from "@/shared/api/apiTypes";

export type StudentsListResponse =
  paths["/api/students"]["get"]["responses"][200]["content"]["application/json"];

export type StudentListItem = StudentsListResponse["items"][number];

export type CreateStudentRequest =
  paths["/api/students"]["post"]["requestBody"]["content"]["application/json"];

export type CreateStudentResponse =
  paths["/api/students"]["post"]["responses"][201]["content"]["application/json"];
