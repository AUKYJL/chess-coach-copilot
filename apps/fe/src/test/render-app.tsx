import { render } from "@testing-library/react";
import { RouterProvider } from "react-router-dom";

import { createTestRouter } from "@/app/router";

export function renderApp(
  initialEntry = "/students/demo-student",
  options?: {
    environment?: { DEV: boolean };
  },
) {
  const router = createTestRouter(
    [initialEntry],
    options?.environment ?? { DEV: true },
  );

  return {
    router,
    ...render(<RouterProvider router={router} />),
  };
}
