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
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  RadioGroup,
  RadioGroupItem,
  Textarea,
} from "@/shared/ui";
import { BUTTON_VARIANT, Button } from "@/shared/ui/button";

import {
  type AnalyzeGameDraft,
  analyzeGameSchema,
  isAnnotatedPgn,
} from "../model";

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
          <DialogTitle>Analyze game</DialogTitle>
          <DialogDescription>
            Submit an already annotated PGN for backend analysis. Only annotated
            PGN is accepted here.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(async (values) => {
              if (!isAnnotatedPgn(values.rawPgn)) {
                return;
              }

              await onSubmit({
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
                variant={BUTTON_VARIANT.OUTLINE}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Analyze game</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
