import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import type { AnalyzeGameDraft } from "../model/types";

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
  RadioGroup,
  RadioGroupItem,
  Textarea,
} from "@/shared/ui";

function looksLikePgn(value: string) {
  return /\[Event\s+".*"\]/.test(value) && /\d+\./.test(value);
}

function hasAnnotation(value: string) {
  return /\{[^}]+\}|\$\d+|(?:\!\!|\?\?|\!\?|\?\!|!|\?)(?=\s|$)/.test(value);
}

function isAnnotatedPgn(value: string) {
  return looksLikePgn(value) && hasAnnotation(value);
}

const analyzeGameSchema = z.object({
  rawPgn: z
    .string()
    .trim()
    .min(1, "Annotated PGN is required.")
    .superRefine((value, context) => {
      if (!looksLikePgn(value)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid PGN with headers and move text.",
        });
        return;
      }

      if (!hasAnnotation(value)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Only annotated PGN is supported in this prototype. Add comments or move annotations before importing.",
        });
      }
    }),
  studentColor: z.enum(["WHITE", "BLACK"]),
  sourceLabel: z.string().trim().max(80, "Keep the source label under 80 characters."),
});

type AnalyzeGameDialogProps = {
  open: boolean;
  draft: AnalyzeGameDraft;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: AnalyzeGameDraft) => void;
};

export function AnalyzeGameDialog({
  open,
  draft,
  onOpenChange,
  onSubmit,
}: AnalyzeGameDialogProps) {
  const form = useForm<AnalyzeGameDraft>({
    resolver: zodResolver(analyzeGameSchema),
    defaultValues: draft,
  });

  useEffect(() => {
    form.reset(draft);
  }, [draft, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Analyze game</DialogTitle>
          <DialogDescription>
            This mock-only workflow accepts already annotated PGN only. No network
            request is made in this prototype.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => {
              if (!isAnnotatedPgn(values.rawPgn)) {
                return;
              }

              onSubmit({
                rawPgn: values.rawPgn.trim(),
                studentColor: values.studentColor,
                sourceLabel: values.sourceLabel.trim(),
              });
            })}
          >
            <FormField
              control={form.control}
              name="rawPgn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Annotated PGN</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder='[Event "Training Game"] ... 12. Qxh2+? {Missed threat}'
                      rows={10}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="studentColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student color</FormLabel>
                  <FormControl>
                    <RadioGroup
                      className="grid grid-cols-2 gap-3"
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <label className="border-border bg-surface flex items-center gap-3 rounded-2xl border px-4 py-3">
                        <RadioGroupItem value="WHITE" />
                        <span className="text-sm">White</span>
                      </label>
                      <label className="border-border bg-surface flex items-center gap-3 rounded-2xl border px-4 py-3">
                        <RadioGroupItem value="BLACK" />
                        <span className="text-sm">Black</span>
                      </label>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sourceLabel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source label</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Annotated export" />
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
