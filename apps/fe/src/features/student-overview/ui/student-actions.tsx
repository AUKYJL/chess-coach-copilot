import { MoreHorizontal, Sparkles } from "lucide-react";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui";

type StudentActionsProps = {
  isArchived: boolean;
  onAnalyzeGame: () => void;
  onOpenChessAccounts: () => void;
  onEditStudent: () => void;
  onToggleArchived: () => void;
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
      <Button size="lg" className="sm:flex-none" onClick={onAnalyzeGame}>
        <Sparkles className="size-4" />
        Analyze game
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="More actions">
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
          <DropdownMenuItem onClick={onToggleArchived}>
            {isArchived ? "Restore student" : "Archive student"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
