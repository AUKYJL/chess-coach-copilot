import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Form,
  FormTextareaField,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui";
import { BUTTON_SIZE, BUTTON_VARIANT, Button } from "@/shared/ui/button";

import type {
  GameAnalysisCriticalMomentViewModel,
  GameAnalysisReviewStatus,
} from "../model";

import { ToneBadge } from "./tone-badge";

const reviewNoteSchema = z.object({
  coachNote: z
    .string()
    .trim()
    .max(1000, "Заметка тренера должна быть не длиннее 1000 символов."),
});

type DetailRowProps = {
  label: string;
  value: string | null;
};

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="space-y-1.5">
      <Typography
        color={TYPOGRAPHY_COLOR.SECONDARY}
        variant={TYPOGRAPHY_VARIANT.CAPTION}
      >
        {label}
      </Typography>
      <p className="text-foreground text-sm leading-6">
        {value ?? "Нет данных"}
      </p>
    </div>
  );
}

type CriticalMomentDetailsProps = {
  isSubmittingReview: boolean;
  moment: GameAnalysisCriticalMomentViewModel;
  onSubmitReview: (input: {
    coachNote: string;
    mistakeId: string;
    status: GameAnalysisReviewStatus;
  }) => Promise<void>;
  reviewErrorMessage: string | null;
};

export function CriticalMomentDetails({
  isSubmittingReview,
  moment,
  onSubmitReview,
  reviewErrorMessage,
}: CriticalMomentDetailsProps) {
  const initialValues = useMemo(
    () => ({
      coachNote: moment.coachNote,
    }),
    [moment.coachNote],
  );
  const form = useForm<z.infer<typeof reviewNoteSchema>>({
    resolver: zodResolver(reviewNoteSchema),
    defaultValues: initialValues,
  });
  const hasPersistedFinding = moment.mistakeId !== null;
  const reviewStateCopy = (() => {
    switch (moment.reviewStatus) {
      case "CONFIRMED":
        return {
          body: "Тренер подтвердил вывод AI. Эпизод остается в разборе как подтвержденный.",
          label: "Подтверждено",
          panelClassName:
            "border border-emerald-200 bg-emerald-50 text-emerald-900",
        };
      case "REJECTED":
        return {
          body: "Тренер отклонил вывод AI. Эпизод остается видимым, но помечен как отклоненный.",
          label: "Отклонено",
          panelClassName: "border border-rose-200 bg-rose-50 text-rose-900",
        };
      default:
        return {
          body: "Эпизод еще не проверен. Подтвердите или отклоните вывод AI и при необходимости добавьте заметку.",
          label: "Без решения",
          panelClassName:
            "border border-border bg-surface-subtle text-foreground",
        };
    }
  })();

  useEffect(() => {
    form.reset(initialValues);
  }, [form, initialValues, moment.id]);

  async function submitReview(status: GameAnalysisReviewStatus) {
    if (!moment.mistakeId) {
      return;
    }

    const isValid = await form.trigger();

    if (!isValid) {
      return;
    }

    await onSubmitReview({
      mistakeId: moment.mistakeId,
      status,
      coachNote: form.getValues("coachNote"),
    });
  }

  return (
    <Card className="h-full">
      <CardHeader className="gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{moment.moveLabel}</CardTitle>
            <ToneBadge
              label={moment.severityLabel}
              tone={moment.severityTone}
            />
          </div>
          {moment.weaknessTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {moment.weaknessTags.map((tag) => (
                <ToneBadge key={tag} label={tag} tone="neutral" />
              ))}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <DetailRow label="Оценка до" value={moment.evaluationBeforeLabel} />
          <DetailRow label="Оценка после" value={moment.evaluationAfterLabel} />
          <DetailRow label="Сдвиг" value={moment.evaluationSwingLabel} />
        </div>

        <DetailRow label="Что произошло" value={moment.explanation} />
        <DetailRow label="Лучший ход" value={moment.bestMove} />
        <DetailRow label="Лучший вариант" value={moment.bestLine} />
        <DetailRow label="Подсказка для ученика" value={moment.suggestedFix} />

        {moment.comments.length > 1 ? (
          <div className="space-y-2">
            <Typography
              color={TYPOGRAPHY_COLOR.SECONDARY}
              variant={TYPOGRAPHY_VARIANT.CAPTION}
            >
              Комментарии аннотаций
            </Typography>
            <div className="space-y-2">
              {moment.comments.map((comment) => (
                <p
                  key={comment}
                  className="border-border bg-surface-subtle rounded-[20px] border px-3 py-3 text-sm leading-6"
                >
                  {comment}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          <div
            className={`rounded-[22px] px-4 py-4 ${reviewStateCopy.panelClassName}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold">
                Статус проверки: {reviewStateCopy.label}
              </p>
              {moment.reviewStatus !== "UNREVIEWED" ? (
                <Button
                  disabled={!hasPersistedFinding || isSubmittingReview}
                  onClick={() => submitReview("UNREVIEWED")}
                  size={BUTTON_SIZE.SM}
                  type="button"
                  variant={BUTTON_VARIANT.GHOST}
                >
                  Сбросить
                </Button>
              ) : null}
            </div>
            <p className="mt-2 text-sm leading-6">{reviewStateCopy.body}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!hasPersistedFinding || isSubmittingReview}
              onClick={() => submitReview("CONFIRMED")}
              size={BUTTON_SIZE.SM}
              type="button"
              variant={
                moment.reviewStatus === "CONFIRMED"
                  ? BUTTON_VARIANT.SECONDARY
                  : BUTTON_VARIANT.DEFAULT
              }
            >
              {moment.reviewStatus === "CONFIRMED"
                ? "Подтверждено"
                : "Подтвердить"}
            </Button>
            <Button
              disabled={!hasPersistedFinding || isSubmittingReview}
              onClick={() => submitReview("REJECTED")}
              size={BUTTON_SIZE.SM}
              type="button"
              variant={
                moment.reviewStatus === "REJECTED"
                  ? BUTTON_VARIANT.SECONDARY
                  : BUTTON_VARIANT.DESTRUCTIVE
              }
            >
              {moment.reviewStatus === "REJECTED" ? "Отклонено" : "Отклонить"}
            </Button>
          </div>

          <Form {...form}>
            <form
              className="space-y-3"
              onSubmit={form.handleSubmit(async (values) => {
                if (!moment.mistakeId) {
                  return;
                }

                await onSubmitReview({
                  mistakeId: moment.mistakeId,
                  status: moment.reviewStatus,
                  coachNote: values.coachNote,
                });
              })}
            >
              <FormTextareaField
                control={form.control}
                description="Заметка сохраняется вместе с текущим статусом эпизода."
                disabled={!hasPersistedFinding || isSubmittingReview}
                label="Заметка тренера"
                name="coachNote"
                placeholder="Например: AI верно нашел идею, но ученику важнее проговорить план после тактики."
                rows={5}
              />

              {reviewErrorMessage ? (
                <p className="text-danger text-sm leading-6">
                  {reviewErrorMessage}
                </p>
              ) : null}

              <Button
                disabled={
                  !hasPersistedFinding ||
                  isSubmittingReview ||
                  !form.formState.isDirty
                }
                size={BUTTON_SIZE.SM}
                type="submit"
                variant={BUTTON_VARIANT.OUTLINE}
              >
                Сохранить заметку
              </Button>
            </form>
          </Form>
        </div>
      </CardContent>
    </Card>
  );
}
