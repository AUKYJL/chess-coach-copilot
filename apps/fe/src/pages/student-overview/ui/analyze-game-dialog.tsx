import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormInputField,
  FormItem,
  FormLabel,
  FormMessage,
  FormTextareaField,
  RadioGroup,
  RadioGroupItem,
} from "@/shared/ui";
import { BUTTON_VARIANT, Button } from "@/shared/ui/button";

import { type AnalyzeGameDraft, analyzeGameSchema } from "../model";

type AnalyzeGameDialogProps = {
  open: boolean;
  draft: AnalyzeGameDraft;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: AnalyzeGameDraft) => Promise<void>;
};

export function AnalyzeGameDialog({
  open,
  draft,
  onOpenChange,
  onSubmit,
}: AnalyzeGameDialogProps) {
  const initialDraft = useMemo(
    () => ({
      rawPgn: draft.rawPgn,
      sourceLabel: draft.sourceLabel,
      studentColor: draft.studentColor,
    }),
    [draft.rawPgn, draft.sourceLabel, draft.studentColor],
  );
  const form = useForm<AnalyzeGameDraft>({
    resolver: zodResolver(analyzeGameSchema),
    defaultValues: initialDraft,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset(initialDraft);
  }, [form, initialDraft, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Проанализировать партию</DialogTitle>
          <DialogDescription>
            Вставьте PGN. Если в нём нет данных движка, мы запустим анализ
            Stockfish — это может занять несколько минут.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(async (values) => {
              await onSubmit({
                rawPgn: values.rawPgn.trim(),
                studentColor: values.studentColor,
                sourceLabel: values.sourceLabel.trim(),
              });
            })}
          >
            <FormTextareaField
              control={form.control}
              name="rawPgn"
              label="PGN"
              placeholder={
                '[Event "Тренировочная партия"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 1-0'
              }
              rows={10}
            />

            <FormField
              control={form.control}
              name="studentColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Цвет ученика</FormLabel>
                  <FormControl>
                    <RadioGroup
                      className="grid grid-cols-2 gap-3"
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <label className="border-border bg-surface flex items-center gap-3 rounded-2xl border px-4 py-3">
                        <RadioGroupItem value="WHITE" />
                        <span className="text-sm">Белые</span>
                      </label>
                      <label className="border-border bg-surface flex items-center gap-3 rounded-2xl border px-4 py-3">
                        <RadioGroupItem value="BLACK" />
                        <span className="text-sm">Чёрные</span>
                      </label>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormInputField
              control={form.control}
              name="sourceLabel"
              label="Подпись источника"
              placeholder="Экспорт с Lichess"
            />

            <DialogFooter>
              <Button
                type="button"
                variant={BUTTON_VARIANT.OUTLINE}
                disabled={form.formState.isSubmitting}
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? "Отправляем PGN..."
                  : "Проанализировать партию"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
