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
  FormTextareaField,
} from "@/shared/ui";
import { BUTTON_VARIANT, Button } from "@/shared/ui/button";

import type { CoachNotesDraft } from "../model";

const coachNotesSchema = z.object({
  notes: z
    .string()
    .trim()
    .max(1000, "Заметки должны быть не длиннее 1000 символов."),
});

type CoachNotesDialogProps = {
  open: boolean;
  draft: CoachNotesDraft;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: CoachNotesDraft) => Promise<void>;
};

export function CoachNotesDialog({
  open,
  draft,
  onOpenChange,
  onSubmit,
}: CoachNotesDialogProps) {
  const initialDraft = useMemo(
    () => ({
      notes: draft.notes,
    }),
    [draft.notes],
  );
  const form = useForm<CoachNotesDraft>({
    resolver: zodResolver(coachNotesSchema),
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
          <DialogTitle>Заметки тренера</DialogTitle>
          <DialogDescription>
            Сохраните заметки тренера для боковой панели ученика.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(
              async (values) => await onSubmit({ notes: values.notes.trim() }),
            )}
          >
            <FormTextareaField
              control={form.control}
              name="notes"
              label="Заметки"
              rows={8}
            />

            <DialogFooter>
              <Button
                type="button"
                variant={BUTTON_VARIANT.OUTLINE}
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </Button>
              <Button type="submit">Сохранить заметки</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
