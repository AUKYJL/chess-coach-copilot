import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import type { CoachNotesDraft } from "../model/types";

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
  Textarea,
} from "@/shared/ui";

const coachNotesSchema = z.object({
  notes: z.string().trim().max(1000, "Keep notes under 1000 characters."),
});

type CoachNotesDialogProps = {
  open: boolean;
  draft: CoachNotesDraft;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: CoachNotesDraft) => void;
};

export function CoachNotesDialog({
  open,
  draft,
  onOpenChange,
  onSubmit,
}: CoachNotesDialogProps) {
  const form = useForm<CoachNotesDraft>({
    resolver: zodResolver(coachNotesSchema),
    defaultValues: draft,
  });

  useEffect(() => {
    form.reset(draft);
  }, [draft, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Coach notes</DialogTitle>
          <DialogDescription>
            These notes stay local to the prototype and update the right-rail context.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) =>
              onSubmit({ notes: values.notes.trim() }),
            )}
          >
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={8} />
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
                Cancel
              </Button>
              <Button type="submit">Save locally</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
