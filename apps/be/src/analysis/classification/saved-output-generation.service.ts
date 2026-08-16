import { Injectable } from '@nestjs/common';
import { ReportAudience, type Prisma } from '../../generated/prisma/client.js';
import { LlmService } from '../../llm/llm.service.js';
import {
  COACH_REPORT_PROMPT,
  HOMEWORK_PROMPT,
  PARENT_REPORT_PROMPT,
  PROGRESS_ANALYSIS_PROMPT,
} from './analysis-classifier.prompt.js';
import {
  generatedHomeworkPayloadSchema,
  validateGeneratedHomeworkPayload,
} from './generated-homework.schema.js';
import {
  generatedProgressPayloadSchema,
  type ProgressSummary,
  validateGeneratedProgressPayload,
} from './generated-progress.schema.js';
import {
  generatedReportPayloadSchema,
  validateGeneratedReportPayload,
} from './generated-report.schema.js';
import type { SavedAnalysisInput } from './saved-analysis-input.type.js';

export interface GeneratedReportArtifact {
  title: string;
  content: Prisma.InputJsonObject;
  promptVersion: string;
  model: string;
  rawOutput: Prisma.InputJsonValue;
  inputPayload: Prisma.InputJsonObject;
}

export interface GeneratedHomeworkArtifact {
  title: string;
  content: Prisma.InputJsonObject;
  promptVersion: string;
  model: string;
  rawOutput: Prisma.InputJsonValue;
  inputPayload: Prisma.InputJsonObject;
}

export interface GeneratedProgressArtifact {
  summary: ProgressSummary;
  promptVersion: string;
  model: string;
  rawOutput: Prisma.InputJsonValue;
  inputPayload: Prisma.InputJsonObject;
}

@Injectable()
export class SavedOutputGenerationService {
  constructor(private readonly llmService: LlmService) {}

  async generateReport(data: {
    analysis: SavedAnalysisInput;
    audience: ReportAudience;
  }): Promise<GeneratedReportArtifact> {
    const inputPayload: Prisma.InputJsonObject = {
      audience: data.audience,
      analysis: this.toInputJsonObject(data.analysis),
    };
    const llmResponse = await this.llmService.generateStructured({
      systemPrompt:
        data.audience === ReportAudience.PARENT
          ? PARENT_REPORT_PROMPT
          : COACH_REPORT_PROMPT,
      userPrompt: JSON.stringify(inputPayload),
      structuredOutput: {
        name: 'generated_report_payload',
        schema: generatedReportPayloadSchema,
      },
    });
    const payload = validateGeneratedReportPayload(llmResponse.payload);

    return {
      title: payload.title,
      content: {
        summary: payload.summary,
        highlights: payload.highlights,
        lessonFocus: payload.lessonFocus,
        nextSteps: payload.nextSteps,
      },
      promptVersion: llmResponse.promptVersion,
      model: llmResponse.model,
      rawOutput: llmResponse.payload,
      inputPayload,
    };
  }

  async generateHomework(data: {
    analysis: SavedAnalysisInput;
  }): Promise<GeneratedHomeworkArtifact> {
    const inputPayload: Prisma.InputJsonObject = {
      analysis: this.toInputJsonObject(data.analysis),
    };
    const llmResponse = await this.llmService.generateStructured({
      systemPrompt: HOMEWORK_PROMPT,
      userPrompt: JSON.stringify(inputPayload),
      structuredOutput: {
        name: 'generated_homework_payload',
        schema: generatedHomeworkPayloadSchema,
      },
    });
    const payload = validateGeneratedHomeworkPayload(llmResponse.payload);

    return {
      title: payload.title,
      content: {
        overview: payload.overview,
        exercises: payload.exercises,
        focusPoints: payload.focusPoints,
        notes: payload.notes,
      },
      promptVersion: llmResponse.promptVersion,
      model: llmResponse.model,
      rawOutput: llmResponse.payload,
      inputPayload,
    };
  }

  async generateProgress(data: {
    studentId: string;
    analyses: SavedAnalysisInput[];
  }): Promise<GeneratedProgressArtifact> {
    const inputPayload: Prisma.InputJsonObject = {
      studentId: data.studentId,
      analyses: data.analyses.map((analysis) =>
        this.toInputJsonObject(analysis),
      ),
    };
    const llmResponse = await this.llmService.generateStructured({
      systemPrompt: PROGRESS_ANALYSIS_PROMPT,
      userPrompt: JSON.stringify(inputPayload),
      structuredOutput: {
        name: 'generated_progress_payload',
        schema: generatedProgressPayloadSchema,
      },
    });
    const payload = validateGeneratedProgressPayload(llmResponse.payload);

    return {
      summary: {
        summary: payload.summary,
        improvements: payload.improvements,
        recurringWeaknesses: payload.recurringWeaknesses,
        nextFocusPoints: payload.nextFocusPoints,
        confidenceLevel: payload.confidenceLevel,
      },
      promptVersion: llmResponse.promptVersion,
      model: llmResponse.model,
      rawOutput: llmResponse.payload,
      inputPayload,
    };
  }

  private toInputJsonObject(value: SavedAnalysisInput): Prisma.InputJsonObject {
    return {
      id: value.id,
      studentId: value.studentId,
      gameId: value.gameId,
      confidenceLevel: value.confidenceLevel,
      overallDiagnosis: value.overallDiagnosis,
      openingName: value.openingName,
      result: value.result,
      mainWeaknessTag: value.mainWeaknessTag,
      secondaryWeaknessTags: value.secondaryWeaknessTags,
      recommendedLessonTitle: value.recommendedLessonTitle,
      recommendedLessonWhy: value.recommendedLessonWhy,
      recommendedFocusPoints: value.recommendedFocusPoints,
      criticalMoments: value.criticalMoments as Prisma.InputJsonArray,
      mistakes: value.mistakes,
    };
  }
}
