import { NotebookPen, UserRound } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui";
import { BUTTON_SIZE, BUTTON_VARIANT, Button } from "@/shared/ui/button";

import type {
  ChessAccountItem,
  CoachNotesViewModel,
  StudentInformationItem,
} from "../model";

type StudentContextPanelProps = {
  accounts: ChessAccountItem[];
  coachNotes: CoachNotesViewModel;
  studentInformation: StudentInformationItem[];
  onOpenChessAccounts: () => void;
  onOpenCoachNotes: () => void;
};

export function StudentContextPanel({
  accounts,
  coachNotes,
  studentInformation,
  onOpenChessAccounts,
  onOpenCoachNotes,
}: StudentContextPanelProps) {
  return (
    <div className="space-y-4 md:space-y-5">
      <Card>
        <CardHeader className="gap-2">
          <div className="flex items-center gap-2">
            <UserRound className="text-accent size-4" />
            <CardTitle>Информация об ученике</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {studentInformation.map((item, index) => (
            <div key={item.id} className="space-y-3">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="text-foreground text-right font-medium">
                  {item.value}
                </span>
              </div>
              {index < studentInformation.length - 1 ? <Separator /> : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-2">
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Шахматные аккаунты</CardTitle>
            <Button
              variant={BUTTON_VARIANT.GHOST}
              size={BUTTON_SIZE.SM}
              onClick={onOpenChessAccounts}
            >
              Изменить
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {accounts.length > 0 ? (
            accounts.map((account, index) => (
              <div key={account.id} className="space-y-3">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-foreground font-medium">
                    {account.platformLabel}
                  </span>
                  <span className="text-muted-foreground">
                    {account.username}
                  </span>
                </div>
                {index < accounts.length - 1 ? <Separator /> : null}
              </div>
            ))
          ) : (
            <Typography
              color={TYPOGRAPHY_COLOR.SECONDARY}
              variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
            >
              Пока нет привязанных шахматных аккаунтов.
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <NotebookPen className="text-accent size-4" />
              <CardTitle>Заметки тренера</CardTitle>
            </div>
            <Button
              variant={BUTTON_VARIANT.GHOST}
              size={BUTTON_SIZE.SM}
              onClick={onOpenCoachNotes}
            >
              Изменить
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p
            className={
              coachNotes.isEmpty
                ? "text-muted-foreground text-sm leading-7"
                : "text-foreground text-sm leading-7"
            }
          >
            {coachNotes.body}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
