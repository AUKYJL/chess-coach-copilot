import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import type { EditStudentDraft } from "../model/types";

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
  Textarea,
} from "@/shared/ui";

const editStudentSchema = z.object({
  displayName: z.string().trim().min(1, "Student name is required."),
  birthYear: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        (/^\d+$/.test(value) &&
          Number(value) >= 1990 &&
          Number(value) <= 2026),
      "Birth year must be between 1990 and 2026.",
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

type EditStudentDialogProps = {
  open: boolean;
  draft: EditStudentDraft;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: EditStudentDraft) => void;
};

export function EditStudentDialog({
  open,
  draft,
  onOpenChange,
  onSubmit,
}: EditStudentDialogProps) {
  const form = useForm<EditStudentFormValues>({
    resolver: zodResolver(editStudentSchema),
    defaultValues: {
      displayName: draft.displayName,
      birthYear: draft.birthYear !== null ? String(draft.birthYear) : "",
      rating: draft.rating !== null ? String(draft.rating) : "",
      notes: draft.notes,
    },
  });

  useEffect(() => {
    form.reset({
      displayName: draft.displayName,
      birthYear: draft.birthYear !== null ? String(draft.birthYear) : "",
      rating: draft.rating !== null ? String(draft.rating) : "",
      notes: draft.notes,
    });
  }, [draft, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit student</DialogTitle>
          <DialogDescription>
            Update student identity locally for this prototype review.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) =>
              onSubmit({
                displayName: values.displayName.trim(),
                birthYear: values.birthYear.trim() ? Number(values.birthYear) : null,
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
                      <Input
                        {...field}
                        type="number"
                        placeholder="2012"
                      />
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
                      <Input
                        {...field}
                        type="number"
                        placeholder="1620"
                      />
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
