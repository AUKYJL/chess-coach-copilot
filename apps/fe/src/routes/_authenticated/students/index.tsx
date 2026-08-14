/* oxlint-disable react/only-export-components */
import { createFileRoute } from "@tanstack/react-router";

import { StudentsPage } from "@/pages/students";
import { studentsSearchSchema } from "@/pages/students/model/students-route-search";

export const Route = createFileRoute("/_authenticated/students/")({
  validateSearch: studentsSearchSchema,
  component: StudentsRoute,
});

function StudentsRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <StudentsPage
      navigateToStudent={(studentId) =>
        navigate({
          to: "/students/$studentId",
          params: {
            studentId,
          },
        })
      }
      search={search}
      setSearch={(updater) =>
        navigate({
          to: "/students",
          search: updater,
          replace: true,
        })
      }
    />
  );
}
