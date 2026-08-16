import type { Prisma } from '../generated/prisma/client.js';
import type { GeneratedReportPayload } from '../analysis/classification/generated-report.schema.js';

export type CanonicalReportContent = {
  text: string;
};

type LegacyStructuredReportContent = {
  summary: string;
  highlights: string[];
  lessonFocus: string[];
  nextSteps: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
}

function readStringList(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const items = value
    .map((item) => readNonEmptyString(item))
    .filter((item): item is string => item !== null);

  return items.length > 0 ? items : [];
}

function readLegacyStructuredContent(
  value: unknown,
): LegacyStructuredReportContent | null {
  if (!isRecord(value)) {
    return null;
  }

  const summary = readNonEmptyString(value.summary);
  const highlights = readStringList(value.highlights) ?? [];
  const lessonFocus = readStringList(value.lessonFocus) ?? [];
  const nextSteps = readStringList(value.nextSteps) ?? [];

  if (summary === null) {
    return null;
  }

  return {
    summary,
    highlights,
    lessonFocus,
    nextSteps,
  };
}

function formatSection(title: string, items: string[]): string | null {
  if (items.length === 0) {
    return null;
  }

  return `${title}\n${items.map((item) => `- ${item}`).join('\n')}`;
}

export function formatStructuredReportText(
  content: LegacyStructuredReportContent | GeneratedReportPayload,
): string {
  const sections = [
    `Резюме\n${content.summary}`,
    formatSection('Ключевые моменты', content.highlights),
    formatSection('Фокус урока', content.lessonFocus),
    formatSection('Следующие шаги', content.nextSteps),
  ].filter((section): section is string => section !== null);

  return sections.join('\n\n');
}

export function normalizeReportContent(
  content: unknown,
): CanonicalReportContent {
  if (isRecord(content)) {
    const text = readNonEmptyString(content.text);

    if (text !== null) {
      return { text };
    }
  }

  const legacyContent = readLegacyStructuredContent(content);

  if (legacyContent) {
    return {
      text: formatStructuredReportText(legacyContent),
    };
  }

  const rawText = readNonEmptyString(content);

  if (rawText !== null) {
    return { text: rawText };
  }

  return {
    text: JSON.stringify(content, null, 2),
  };
}

export function toReportContentJson(
  content: CanonicalReportContent,
): Prisma.InputJsonObject {
  return {
    text: content.text,
  };
}
