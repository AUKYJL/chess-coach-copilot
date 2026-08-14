/* oxlint-disable react/only-export-components */
import { createFileRoute } from "@tanstack/react-router";

import { StudentOverviewPage } from "@/pages/student-overview";

export const Route = createFileRoute("/_authenticated/students/$studentId")({
  component: StudentOverviewRoute,
});

function StudentOverviewRoute() {
  const { studentId } = Route.useParams();

  return <StudentOverviewPage studentId={studentId} />;
}
