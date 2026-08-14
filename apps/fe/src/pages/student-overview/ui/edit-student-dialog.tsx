import { zodResolver } from "@hookform/resolvers/zod";
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
  FormTextareaField,
} from "@/shared/ui";
import { BUTTON_VARIANT, Button } from "@/shared/ui/button";

import type { EditStudentDraft } from "../model";

const editStudentSchema = z.object({
  displayName: z.string().trim().min(1, "Введите имя ученика."),
  birthYear: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        (/^\d+$/.test(value) && Number(value) >= 1900 && Number(value) <= 2100),
      "Год рождения должен быть в диапазоне от 1900 до 2100.",
    ),
  rating: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        (/^\d+$/.test(value) && Number(value) >= 100 && Number(value) <= 4000),
      "Рейтинг должен быть в диапазоне от 100 до 4000.",
    ),
  notes: z
    .string()
    .trim()
    .max(600, "Заметки должны быть не длиннее 600 символов."),
});

type EditStudentFormValues = {
  displayName: string;
  birthYear: string;
  rating: string;
  notes: string;
};

function toEditStudentFormValues(
  draft: EditStudentDraft,
): EditStudentFormValues {
  return {
    displayName: draft.displayName,
    birthYear: draft.birthYear !== null ? String(draft.birthYear) : "",
    rating: draft.rating !== null ? String(draft.rating) : "",
    notes: draft.notes,
  };
}

type EditStudentDialogProps = {
  open: boolean;
  draft: EditStudentDraft;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: EditStudentDraft) => Promise<void>;
};

export function EditStudentDialog({
  open,
  draft,
  onOpenChange,
  onSubmit,
}: EditStudentDialogProps) {
  const initialValues = useMemo(() => toEditStudentFormValues(draft), [draft]);
  const form = useForm<EditStudentFormValues>({
    resolver: zodResolver(editStudentSchema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset(initialValues);
  }, [form, initialValues, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редактировать ученика</DialogTitle>
          <DialogDescription>
            Обновите профиль ученика и сохранённые заметки тренера.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(
              async (values) =>
                await onSubmit({
                  displayName: values.displayName.trim(),
                  birthYear: values.birthYear.trim()
                    ? Number(values.birthYear)
                    : null,
                  rating: values.rating.trim() ? Number(values.rating) : null,
                  notes: values.notes.trim(),
                }),
            )}
          >
            <FormInputField
              control={form.control}
              name="displayName"
              label="Имя ученика"
              placeholder="Александр Иванов"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormInputField
                control={form.control}
                name="birthYear"
                label="Год рождения"
                type="number"
                placeholder="2012"
              />

              <FormInputField
                control={form.control}
                name="rating"
                label="Рейтинг"
                type="number"
                placeholder="1620"
              />
            </div>

            <FormTextareaField
              control={form.control}
              name="notes"
              label="Заметки тренера"
              rows={6}
            />

            <DialogFooter>
              <Button
                type="button"
                variant={BUTTON_VARIANT.OUTLINE}
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </Button>
              <Button type="submit">Сохранить изменения</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
