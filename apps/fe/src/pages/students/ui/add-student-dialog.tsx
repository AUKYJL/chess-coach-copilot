import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
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
  InlineAlert,
  Input,
} from "@/shared/ui";
import { BUTTON_VARIANT, Button } from "@/shared/ui/button";

import type { CreateStudentRequest } from "../model/api-types";

const createStudentSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required.")
    .max(120, "Display name must be 120 characters or fewer."),
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
      "Enter a valid rating.",
    ),
});

type CreateStudentFormValues = {
  displayName: string;
  birthYear: string;
  rating: string;
};

const defaultValues: CreateStudentFormValues = {
  displayName: "",
  birthYear: "",
  rating: "",
};

type AddStudentDialogProps = {
  errorMessage: string | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateStudentRequest) => Promise<void>;
  open: boolean;
};

export function AddStudentDialog({
  errorMessage,
  isPending,
  onOpenChange,
  onSubmit,
  open,
}: AddStudentDialogProps) {
  const form = useForm<CreateStudentFormValues>({
    resolver: zodResolver(createStudentSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
    }
  }, [form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add student</DialogTitle>
          <DialogDescription>
            Add a student to your coaching workspace.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(async (values) => {
              try {
                await onSubmit({
                  displayName: values.displayName.trim(),
                  birthYear: values.birthYear.trim()
                    ? Number(values.birthYear)
                    : undefined,
                  rating: values.rating.trim() ? Number(values.rating) : undefined,
                });
              } catch {
                return;
              }
            })}
          >
            {errorMessage ? <InlineAlert>{errorMessage}</InlineAlert> : null}

            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Alexander Ivanov" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="birthYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Birth year</FormLabel>
                  <FormControl>
                    <Input {...field} inputMode="numeric" placeholder="2012" />
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
                    <Input {...field} inputMode="numeric" placeholder="1450" />
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
              <Button disabled={isPending} type="submit">
                {isPending ? "Adding student…" : "Add student"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
