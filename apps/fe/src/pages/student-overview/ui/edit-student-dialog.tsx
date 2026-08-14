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
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
} from "@/shared/ui";
import { BUTTON_VARIANT, Button } from "@/shared/ui/button";

import type { EditStudentDraft } from "../model";

const editStudentSchema = z.object({
  displayName: z.string().trim().min(1, "Student name is required."),
  birthYear: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        (/^\d+$/.test(value) && Number(value) >= 1900 && Number(value) <= 2100),
      "Birth year must be between 1900 and 2100.",
    ),
  rating: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        (/^\d+$/.test(value) && Number(value) >= 100 && Number(value) <= 4000),
      "Rating must be between 100 and 4000.",
    ),
  notes: z.string().trim().max(600, "Keep notes under 600 characters."),
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
          <DialogTitle>Edit student</DialogTitle>
          <DialogDescription>
            Update the student profile and saved coach notes.
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
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Alexander Ivanov" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="birthYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Birth year</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" placeholder="2012" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rating</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" placeholder="1620" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coach notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={6} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant={BUTTON_VARIANT.OUTLINE}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
