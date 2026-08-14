import { MoreHorizontal, Sparkles } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui";
import { BUTTON_SIZE, BUTTON_VARIANT, Button } from "@/shared/ui/button";

type StudentActionsProps = {
  isArchived: boolean;
  onAnalyzeGame: () => void;
  onOpenChessAccounts: () => void;
  onEditStudent: () => void;
  onToggleArchived: () => Promise<void>;
};

export function StudentActions({
  isArchived,
  onAnalyzeGame,
  onOpenChessAccounts,
  onEditStudent,
  onToggleArchived,
}: StudentActionsProps) {
  return (
    <div className="flex w-full flex-wrap items-center justify-start gap-3 sm:w-auto sm:justify-end">
      <Button
        size={BUTTON_SIZE.LG}
        className="sm:flex-none"
        onClick={onAnalyzeGame}
      >
        <Sparkles className="size-4" />
        Analyze game
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={BUTTON_VARIANT.OUTLINE}
            size={BUTTON_SIZE.ICON}
            aria-label="More actions"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEditStudent}>
            Edit student
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onOpenChessAccounts}>
            Chess accounts
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={async () => {
              await onToggleArchived();
            }}
          >
            {isArchived ? "Restore student" : "Archive student"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
