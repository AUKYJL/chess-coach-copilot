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
    .min(1, "Введите имя ученика.")
    .max(120, "Имя должно содержать не больше 120 символов."),
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
      "Введите корректный рейтинг.",
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
          <DialogTitle>Добавить ученика</DialogTitle>
          <DialogDescription>
            Добавьте ученика в рабочее пространство тренера.
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
                  rating: values.rating.trim()
                    ? Number(values.rating)
                    : undefined,
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
                  <FormLabel>Имя ученика</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Александр Иванов" />
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
                  <FormLabel>Год рождения</FormLabel>
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
                  <FormLabel>Рейтинг</FormLabel>
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
                Отмена
              </Button>
              <Button disabled={isPending} type="submit">
                {isPending ? "Добавляем ученика..." : "Добавить ученика"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
