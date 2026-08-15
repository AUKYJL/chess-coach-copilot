/* oxlint-disable react/only-export-components */
import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/students/$studentId")({
  component: StudentRouteLayout,
});

function StudentRouteLayout() {
  return <Outlet />;
}
