import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
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
  if (!value) {
    return null;
  }

  return (
    <div className="space-y-1">
      <Typography
        color={TYPOGRAPHY_COLOR.SECONDARY}
        variant={TYPOGRAPHY_VARIANT.CAPTION}
      >
        {label}
      </Typography>
      <p className="text-foreground text-sm leading-6">{value}</p>
    </div>
  );
}

function getReviewStatusLabel(status: GameAnalysisReviewStatus): string {
  switch (status) {
    case "CONFIRMED":
      return "Подтверждено";
    case "REJECTED":
      return "Отклонено";
    default:
      return "Не проверено";
  }
}

type CriticalMomentDetailsProps = {
  hasNext: boolean;
  hasPrevious: boolean;
  isSubmittingReview: boolean;
  moment: GameAnalysisCriticalMomentViewModel;
  momentIndex: number;
  momentsCount: number;
  onBack: () => void;
  onGoToNext: () => void;
  onGoToPrevious: () => void;
  onReviewSaved: () => void;
  onSubmitReview: (input: {
    coachNote: string;
    mistakeId: string;
    status: GameAnalysisReviewStatus;
  }) => Promise<boolean>;
  reviewErrorMessage: string | null;
};

export function CriticalMomentDetails({
  hasNext,
  hasPrevious,
  isSubmittingReview,
  moment,
  momentIndex,
  momentsCount,
  onBack,
  onGoToNext,
  onGoToPrevious,
  onReviewSaved,
  onSubmitReview,
  reviewErrorMessage,
}: CriticalMomentDetailsProps) {
  const [isNoteEditorOpen, setIsNoteEditorOpen] = useState(
    Boolean(moment.coachNote),
  );
  const form = useForm<z.infer<typeof reviewNoteSchema>>({
    resolver: zodResolver(reviewNoteSchema),
    defaultValues: {
      coachNote: moment.coachNote,
    },
  });
  const hasPersistedFinding = moment.mistakeId !== null;

  useEffect(() => {
    form.reset({ coachNote: moment.coachNote });
    setIsNoteEditorOpen(Boolean(moment.coachNote));
  }, [form, moment.coachNote, moment.id]);

  async function submitReview(status: GameAnalysisReviewStatus) {
    if (!moment.mistakeId) {
      return;
    }

    const isValid = await form.trigger();

    if (!isValid) {
      setIsNoteEditorOpen(true);
      return;
    }

    const wasSaved = await onSubmitReview({
      mistakeId: moment.mistakeId,
      status,
      coachNote: form.getValues("coachNote"),
    });

    if (wasSaved && status !== "UNREVIEWED") {
      onReviewSaved();
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between gap-3 px-1 pb-5">
          <Button
            onClick={onBack}
            size={BUTTON_SIZE.SM}
            type="button"
            variant={BUTTON_VARIANT.GHOST}
          >
            <ChevronLeft className="size-4" />
            К списку
          </Button>
          <span className="text-muted-foreground text-sm">
            {momentIndex + 1} / {momentsCount}
          </span>
        </div>

        <div className="space-y-5 px-1 pb-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-foreground text-xl font-semibold">
                {moment.moveLabel}
              </h2>
              <ToneBadge label={moment.severityLabel} tone={moment.severityTone} />
              {moment.category ? (
                <ToneBadge label={moment.category} tone="neutral" />
              ) : null}
            </div>
            <p className="text-foreground text-sm font-medium">
              {moment.evaluationBeforeLabel ?? "—"} → {moment.evaluationAfterLabel ?? "—"}
              {moment.evaluationSwingLabel
                ? ` · Потеря оценки: ${moment.evaluationSwingLabel}`
                : ""}
            </p>
            {moment.weaknessTags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {moment.weaknessTags.map((tag) => (
                  <ToneBadge key={tag} label={tag} tone="neutral" />
                ))}
              </div>
            ) : null}
          </div>

          <DetailRow label="Что произошло" value={moment.explanation} />
          <DetailRow label="Лучший ход" value={moment.bestMove} />
          <DetailRow label="Лучший вариант" value={moment.bestLine} />
          <DetailRow label="Подсказка ученику" value={moment.suggestedFix} />

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
                  <p key={comment} className="text-foreground text-sm leading-6">
                    {comment}
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          {isNoteEditorOpen ? (
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
                  disabled={!hasPersistedFinding || isSubmittingReview}
                  label="Заметка тренера"
                  name="coachNote"
                  placeholder="Добавьте контекст для следующего разбора."
                  rows={4}
                />
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
          ) : null}
        </div>
      </div>

      <div className="border-border bg-surface shrink-0 border-t px-1 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-muted-foreground text-sm">
            ● {getReviewStatusLabel(moment.reviewStatus)}
          </span>
          {!isNoteEditorOpen ? (
            <Button
              onClick={() => setIsNoteEditorOpen(true)}
              size={BUTTON_SIZE.SM}
              type="button"
              variant={BUTTON_VARIANT.GHOST}
            >
              <Plus className="size-4" />
              Заметка
            </Button>
          ) : null}
        </div>

        {reviewErrorMessage ? (
          <p className="text-danger mt-3 text-sm leading-6">
            {reviewErrorMessage}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
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

        <div className="mt-5 flex items-center justify-between gap-2">
          <Button
            disabled={!hasPrevious}
            onClick={onGoToPrevious}
            size={BUTTON_SIZE.SM}
            type="button"
            variant={BUTTON_VARIANT.GHOST}
          >
            <ChevronLeft className="size-4" />
            Предыдущий
          </Button>
          <Button
            disabled={!hasNext}
            onClick={onGoToNext}
            size={BUTTON_SIZE.SM}
            type="button"
            variant={BUTTON_VARIANT.GHOST}
          >
            Следующий
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
