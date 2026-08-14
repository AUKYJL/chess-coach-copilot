import { zodResolver } from "@hookform/resolvers/zod";
import { PencilLine, Trash2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormInputField,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from "@/shared/ui";
import { BUTTON_SIZE, BUTTON_VARIANT, Button } from "@/shared/ui/button";

import type { ChessAccountDraft, ChessAccountItem } from "../model";

const chessAccountSchema = z.object({
  platform: z.enum(["LICHESS", "CHESS_COM"]),
  username: z.string().trim().min(1, "Введите имя пользователя."),
});

type ChessAccountsDialogProps = {
  open: boolean;
  accounts: ChessAccountItem[];
  editingAccountId: string | null;
  draft: ChessAccountDraft;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    draft: ChessAccountDraft,
    accountId?: string | null,
  ) => Promise<void>;
  onEditAccount: (accountId: string) => void;
  onRemoveAccount: (accountId: string) => Promise<void>;
};

export function ChessAccountsDialog({
  open,
  accounts,
  editingAccountId,
  draft,
  onOpenChange,
  onSubmit,
  onEditAccount,
  onRemoveAccount,
}: ChessAccountsDialogProps) {
  const initialDraft = useMemo(
    () => ({
      platform: draft.platform,
      username: draft.username,
    }),
    [draft.platform, draft.username],
  );
  const form = useForm<ChessAccountDraft>({
    resolver: zodResolver(chessAccountSchema),
    defaultValues: initialDraft,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset(initialDraft);
  }, [editingAccountId, form, initialDraft, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,48rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Шахматные аккаунты</DialogTitle>
          <DialogDescription>
            Добавляйте, редактируйте и удаляйте привязанные шахматные аккаунты
            ученика.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            {accounts.length > 0 ? (
              accounts.map((account, index) => (
                <div key={account.id} className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-foreground text-sm font-semibold">
                        {account.platformLabel}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {account.username}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={BUTTON_VARIANT.GHOST}
                        size={BUTTON_SIZE.SM}
                        onClick={() => onEditAccount(account.id)}
                      >
                        <PencilLine className="size-4" />
                        Изменить
                      </Button>
                      <Button
                        variant={BUTTON_VARIANT.GHOST}
                        size={BUTTON_SIZE.SM}
                        onClick={async () => {
                          await onRemoveAccount(account.id);
                        }}
                      >
                        <Trash2 className="size-4" />
                        Удалить
                      </Button>
                    </div>
                  </div>
                  {index < accounts.length - 1 ? <Separator /> : null}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">
                Пока нет привязанных шахматных аккаунтов.
              </p>
            )}
          </div>

          <div className="border-border rounded-[24px] border p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-foreground text-sm font-semibold">
                {editingAccountId ? "Изменить аккаунт" : "Добавить аккаунт"}
              </h3>
              {editingAccountId ? (
                <Button
                  variant={BUTTON_VARIANT.GHOST}
                  size={BUTTON_SIZE.SM}
                  onClick={() => onEditAccount("")}
                >
                  Добавить ещё аккаунт
                </Button>
              ) : null}
            </div>

            <Form {...form}>
              <form
                className="space-y-4"
                onSubmit={form.handleSubmit(
                  async (values) =>
                    await onSubmit(
                      {
                        platform: values.platform,
                        username: values.username.trim(),
                      },
                      editingAccountId,
                    ),
                )}
              >
                <FormField
                  control={form.control}
                  name="platform"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Платформа</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите платформу" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="LICHESS">Lichess</SelectItem>
                          <SelectItem value="CHESS_COM">Chess.com</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormInputField
                  control={form.control}
                  name="username"
                  label="Имя пользователя"
                  placeholder="alexander_ivanov_2012"
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant={BUTTON_VARIANT.OUTLINE}
                    onClick={() => onOpenChange(false)}
                  >
                    Готово
                  </Button>
                  <Button type="submit">
                    {editingAccountId
                      ? "Сохранить аккаунт"
                      : "Добавить аккаунт"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
