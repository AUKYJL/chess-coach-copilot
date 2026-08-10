import { zodResolver } from "@hookform/resolvers/zod";
import { PencilLine, Trash2 } from "lucide-react";
import { z } from "zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import type { ChessAccountDraft, ChessAccountItem, ExternalPlatform } from "../model/types";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from "@/shared/ui";

const chessAccountSchema = z.object({
  platform: z.enum(["LICHESS", "CHESS_COM"]),
  username: z.string().trim().min(1, "Username is required."),
});

type ChessAccountsDialogProps = {
  open: boolean;
  accounts: ChessAccountItem[];
  editingAccountId: string | null;
  draft: ChessAccountDraft;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: ChessAccountDraft, accountId?: string | null) => void;
  onEditAccount: (accountId: string) => void;
  onRemoveAccount: (accountId: string) => void;
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
  const form = useForm<ChessAccountDraft>({
    resolver: zodResolver(chessAccountSchema),
    defaultValues: draft,
  });

  useEffect(() => {
    form.reset(draft);
  }, [draft, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,48rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chess accounts</DialogTitle>
          <DialogDescription>
            Add, edit, or remove linked chess accounts locally for this prototype.
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
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditAccount(account.id)}
                      >
                        <PencilLine className="size-4" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveAccount(account.id)}
                      >
                        <Trash2 className="size-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                  {index < accounts.length - 1 ? <Separator /> : null}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">
                No linked chess accounts yet.
              </p>
            )}
          </div>

          <div className="border-border rounded-[24px] border p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-foreground text-sm font-semibold">
                {editingAccountId ? "Edit account" : "Add account"}
              </h3>
              {editingAccountId ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    form.reset({
                      platform: "LICHESS",
                      username: "",
                    });
                    onEditAccount("");
                  }}
                >
                  Add another account
                </Button>
              ) : null}
            </div>

            <Form {...form}>
              <form
                className="space-y-4"
                onSubmit={form.handleSubmit((values) =>
                  onSubmit(
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
                      <FormLabel>Platform</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) =>
                          field.onChange(value as ExternalPlatform)
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a platform" />
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

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="alexander_ivanov_2012" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Done
                  </Button>
                  <Button type="submit">
                    {editingAccountId ? "Update locally" : "Add locally"}
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
