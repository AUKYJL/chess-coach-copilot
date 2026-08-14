import {
  Button,
  TYPOGRAPHY_AS,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui";
import { BUTTON_SIZE } from "@/shared/ui/button";

export function StudentsPageHeader({
  onAddStudent,
}: {
  onAddStudent: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <Typography
          as={TYPOGRAPHY_AS.H1}
          color={TYPOGRAPHY_COLOR.PRIMARY}
          variant={TYPOGRAPHY_VARIANT.H2}
        >
          Students
        </Typography>
        <Typography className="text-sm leading-6" color={TYPOGRAPHY_COLOR.SECONDARY}>
          Manage your students and review their progress.
        </Typography>
      </div>

      <Button onClick={onAddStudent} size={BUTTON_SIZE.SM}>
        Add student
      </Button>
    </div>
  );
}
