import 'dotenv/config';
import { createHash } from 'crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  AnalysisJobStatus,
  AnalysisJobType,
  AnnotationCoverage,
  CoachAccountStatus,
  ConfidenceLevel,
  ExternalPlatform,
  GameResult,
  GameSourceType,
  MomentSeverity,
  MoveColor,
  PrismaClient,
  ReportAudience,
  StudentColor,
  WeaknessTag,
  type Prisma,
} from '../src/generated/prisma/client.js';
import { hashPassword } from '../src/auth/auth-crypto.js';

const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = 'adminadmin';
const ADMIN_DISPLAY_NAME = 'Admin Coach';
const ANALYSIS_QUEUE_NAME = 'analysis';
const GENERATED_MODEL = 'seeded-fixture-v1';
const GENERATED_PROMPT_VERSION = 'seed-2026-v1';

const studentIds = {
  anna: 'seed-student-anna-complete',
  boris: 'seed-student-boris-new',
  clara: 'seed-student-clara-in-progress',
  dmitry: 'seed-student-dmitry-failed-retry',
  eva: 'seed-student-eva-progress-gap',
  fedor: 'seed-student-fedor-archived',
} as const;

const gameIds = {
  anna1: 'seed-game-anna-1',
  anna2: 'seed-game-anna-2',
  anna3: 'seed-game-anna-3',
  anna4: 'seed-game-anna-4',
  anna5: 'seed-game-anna-5',
  anna6: 'seed-game-anna-6',
  anna7: 'seed-game-anna-7',
  clara1: 'seed-game-clara-1',
  clara2: 'seed-game-clara-2',
  dmitry1: 'seed-game-dmitry-1',
  dmitry2: 'seed-game-dmitry-2',
  eva1: 'seed-game-eva-1',
  eva2: 'seed-game-eva-2',
  fedor1: 'seed-game-fedor-1',
  fedor2: 'seed-game-fedor-2',
  fedor3: 'seed-game-fedor-3',
} as const;

const jobIds = {
  annaAnalysis1: 'seed-job-anna-analysis-1',
  annaAnalysis2: 'seed-job-anna-analysis-2',
  annaAnalysis3: 'seed-job-anna-analysis-3',
  annaAnalysis4: 'seed-job-anna-analysis-4',
  annaAnalysis5: 'seed-job-anna-analysis-5',
  annaReportCoach: 'seed-job-anna-report-coach',
  annaReportParent: 'seed-job-anna-report-parent',
  annaHomework1: 'seed-job-anna-homework-1',
  annaHomework2: 'seed-job-anna-homework-2',
  annaProgress: 'seed-job-anna-progress',
  claraAnalysis1: 'seed-job-clara-analysis-1',
  claraAnalysis2: 'seed-job-clara-analysis-2',
  dmitryAnalysisCompleted: 'seed-job-dmitry-analysis-completed',
  dmitryAnalysisFailed: 'seed-job-dmitry-analysis-failed',
  dmitryReportFailed: 'seed-job-dmitry-report-failed',
  evaAnalysis1: 'seed-job-eva-analysis-1',
  evaAnalysis2: 'seed-job-eva-analysis-2',
  fedorAnalysis1: 'seed-job-fedor-analysis-1',
  fedorAnalysis2: 'seed-job-fedor-analysis-2',
  fedorAnalysis3: 'seed-job-fedor-analysis-3',
  fedorReport: 'seed-job-fedor-report',
  fedorHomework: 'seed-job-fedor-homework',
  fedorProgress: 'seed-job-fedor-progress',
} as const;

const analysisIds = {
  anna1: 'seed-analysis-anna-1',
  anna2: 'seed-analysis-anna-2',
  anna3: 'seed-analysis-anna-3',
  anna4: 'seed-analysis-anna-4',
  anna5: 'seed-analysis-anna-5',
  dmitry1: 'seed-analysis-dmitry-1',
  eva1: 'seed-analysis-eva-1',
  eva2: 'seed-analysis-eva-2',
  fedor1: 'seed-analysis-fedor-1',
  fedor2: 'seed-analysis-fedor-2',
  fedor3: 'seed-analysis-fedor-3',
} as const;

type SeedDataset = {
  students: Prisma.StudentCreateManyInput[];
  externalAccounts: Prisma.ExternalAccountCreateManyInput[];
  games: Prisma.GameCreateManyInput[];
  analysisJobs: Prisma.AnalysisJobCreateManyInput[];
  analyses: Prisma.GameAnalysisCreateManyInput[];
  criticalMoments: Prisma.CriticalMomentCreateManyInput[];
  mistakes: Prisma.MistakeCreateManyInput[];
  reports: Prisma.ReportCreateManyInput[];
  homeworks: Prisma.HomeworkCreateManyInput[];
  progressSnapshots: Prisma.ProgressSnapshotCreateManyInput[];
  generationTraces: Prisma.GenerationTraceCreateManyInput[];
};

function dateTime(value: string) {
  return new Date(value);
}

function jsonObject<T extends Prisma.InputJsonObject>(value: T): T {
  return value;
}

function jsonArray<T extends Prisma.InputJsonArray>(value: T): T {
  return value;
}

function buildPgn(args: {
  event: string;
  site: string | null;
  date: string;
  white: string | null;
  black: string | null;
  result: string;
  ecoCode: string | null;
  opening: string | null;
  moves: string;
}) {
  return [
    `[Event "${args.event}"]`,
    `[Site "${args.site ?? '?'}"]`,
    `[Date "${args.date}"]`,
    `[White "${args.white ?? 'White'}"]`,
    `[Black "${args.black ?? 'Black'}"]`,
    `[Result "${args.result}"]`,
    ...(args.ecoCode ? [`[ECO "${args.ecoCode}"]`] : []),
    ...(args.opening ? [`[Opening "${args.opening}"]`] : []),
    '',
    `${args.moves} ${args.result}`,
  ].join('\n');
}

function hashPgn(rawPgn: string) {
  return createHash('sha256').update(rawPgn).digest('hex');
}

function buildGameRow(args: {
  id: string;
  coachAccountId: string;
  studentId: string;
  sourceType: GameSourceType;
  sourceLabel: string | null;
  studentColor: StudentColor;
  event: string | null;
  site: string | null;
  whitePlayerName: string | null;
  blackPlayerName: string | null;
  openingHeader: string | null;
  ecoCode: string | null;
  rawResult: string | null;
  derivedResult: GameResult;
  plyCount: number | null;
  hasEngineAnnotations: boolean;
  annotationCoverage: AnnotationCoverage;
  reducedConfidenceWarning: string | null;
  importedAt: string;
  pgnDate: string;
  moves: string;
}): Prisma.GameCreateManyInput {
  const rawPgn = buildPgn({
    event: args.event ?? 'Training Game',
    site: args.site,
    date: args.pgnDate,
    white: args.whitePlayerName,
    black: args.blackPlayerName,
    result: args.rawResult ?? '*',
    ecoCode: args.ecoCode,
    opening: args.openingHeader,
    moves: args.moves,
  });
  const importedAt = dateTime(args.importedAt);

  return {
    id: args.id,
    coachAccountId: args.coachAccountId,
    studentId: args.studentId,
    sourceType: args.sourceType,
    sourceLabel: args.sourceLabel,
    studentColor: args.studentColor,
    event: args.event,
    site: args.site,
    whitePlayerName: args.whitePlayerName,
    blackPlayerName: args.blackPlayerName,
    openingHeader: args.openingHeader,
    ecoCode: args.ecoCode,
    rawResult: args.rawResult,
    derivedResult: args.derivedResult,
    plyCount: args.plyCount,
    rawPgn,
    normalizedPgnHash: hashPgn(rawPgn),
    hasEngineAnnotations: args.hasEngineAnnotations,
    annotationCoverage: args.annotationCoverage,
    reducedConfidenceWarning: args.reducedConfidenceWarning,
    importedAt,
    createdAt: importedAt,
    updatedAt: importedAt,
  };
}

function buildAnalysisJobRow(args: {
  id: string;
  coachAccountId: string;
  studentId: string;
  gameId: string;
  jobType: AnalysisJobType;
  status: AnalysisJobStatus;
  createdAt: string;
  sourceAnalysisId?: string;
  reportAudience?: ReportAudience;
  attemptCount?: number;
  maxAttempts?: number;
  progressPercent?: number | null;
  failureCode?: string | null;
  failureMessage?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  lastRetriedAt?: string | null;
}): Prisma.AnalysisJobCreateManyInput {
  const createdAt = dateTime(args.createdAt);

  return {
    id: args.id,
    coachAccountId: args.coachAccountId,
    studentId: args.studentId,
    gameId: args.gameId,
    jobType: args.jobType,
    sourceAnalysisId: args.sourceAnalysisId ?? null,
    reportAudience: args.reportAudience ?? null,
    status: args.status,
    queueName: ANALYSIS_QUEUE_NAME,
    attemptCount: args.attemptCount ?? 0,
    maxAttempts: args.maxAttempts ?? 3,
    progressPercent: args.progressPercent ?? null,
    failureCode: args.failureCode ?? null,
    failureMessage: args.failureMessage ?? null,
    startedAt: args.startedAt ? dateTime(args.startedAt) : null,
    completedAt: args.completedAt ? dateTime(args.completedAt) : null,
    lastRetriedAt: args.lastRetriedAt ? dateTime(args.lastRetriedAt) : null,
    createdAt,
    updatedAt: createdAt,
  };
}

function buildAnalysisRow(args: {
  id: string;
  coachAccountId: string;
  studentId: string;
  gameId: string;
  analysisJobId: string;
  createdAt: string;
  confidenceLevel: ConfidenceLevel;
  overallDiagnosis: string;
  openingName: string | null;
  result: GameResult;
  mainWeaknessTag: WeaknessTag | null;
  secondaryWeaknessTags: WeaknessTag[];
  recommendedLessonTitle: string | null;
  recommendedLessonWhy: string | null;
  recommendedFocusPoints: string[];
  rawExtractedContext: Prisma.InputJsonObject;
  rawAnalysisJson: Prisma.InputJsonObject;
}): Prisma.GameAnalysisCreateManyInput {
  const createdAt = dateTime(args.createdAt);

  return {
    id: args.id,
    coachAccountId: args.coachAccountId,
    studentId: args.studentId,
    gameId: args.gameId,
    analysisJobId: args.analysisJobId,
    resultVersion: 1,
    confidenceLevel: args.confidenceLevel,
    overallDiagnosis: args.overallDiagnosis,
    openingName: args.openingName,
    result: args.result,
    mainWeaknessTag: args.mainWeaknessTag,
    secondaryWeaknessTags: args.secondaryWeaknessTags,
    recommendedLessonTitle: args.recommendedLessonTitle,
    recommendedLessonWhy: args.recommendedLessonWhy,
    recommendedFocusPoints: jsonArray(args.recommendedFocusPoints),
    rawExtractedContext: args.rawExtractedContext,
    rawAnalysisJson: args.rawAnalysisJson,
    createdAt,
    updatedAt: createdAt,
  };
}

function buildCriticalMomentRow(args: {
  id: string;
  analysisId: string;
  createdAt: string;
  ply: number;
  fullMoveNumber: number;
  moveNumber: string;
  moveColor: MoveColor;
  san: string;
  bestMove: string | null;
  beforeFen: string;
  afterFen: string;
  severity: MomentSeverity;
  summary: string;
}): Prisma.CriticalMomentCreateManyInput {
  const createdAt = dateTime(args.createdAt);

  return {
    id: args.id,
    analysisId: args.analysisId,
    ply: args.ply,
    fullMoveNumber: args.fullMoveNumber,
    moveNumber: args.moveNumber,
    moveColor: args.moveColor,
    san: args.san,
    lan: null,
    uci: null,
    beforeFen: args.beforeFen,
    afterFen: args.afterFen,
    bestMove: args.bestMove,
    bestVariation: jsonArray([
      jsonObject({
        san: args.bestMove ?? 'Qe2',
        note: 'Preferred continuation',
      }),
    ]),
    nags: jsonArray([jsonObject({ code: '$2' })]),
    comments: jsonArray([jsonObject({ text: args.summary })]),
    evaluationBefore: jsonObject({ kind: 'centipawns', value: 40 }),
    evaluationAfter: jsonObject({ kind: 'centipawns', value: -120 }),
    severity: args.severity,
    sourceEvidence: jsonObject({
      source: 'seed',
      note: args.summary,
    }),
    createdAt,
    updatedAt: createdAt,
  };
}

function buildMistakeRow(args: {
  id: string;
  analysisId: string;
  criticalMomentId: string | null;
  createdAt: string;
  severity: MomentSeverity;
  category: string;
  mainTag?: WeaknessTag | null;
  secondaryTags?: WeaknessTag[];
  explanation: string;
  suggestedFix: string | null;
}): Prisma.MistakeCreateManyInput {
  const createdAt = dateTime(args.createdAt);

  return {
    id: args.id,
    analysisId: args.analysisId,
    criticalMomentId: args.criticalMomentId,
    severity: args.severity,
    category: args.category,
    mainTag: args.mainTag ?? null,
    secondaryTags: args.secondaryTags ?? [],
    explanation: args.explanation,
    suggestedFix: args.suggestedFix,
    sourceEvidence: jsonObject({
      source: 'seed',
      category: args.category,
    }),
    createdAt,
    updatedAt: createdAt,
  };
}

function buildReportRow(args: {
  id: string;
  coachAccountId: string;
  studentId: string;
  gameId: string;
  analysisId: string;
  title: string;
  audience: ReportAudience;
  createdAt: string;
  summary: string;
  highlights: string[];
  lessonFocus: string[];
  nextSteps: string[];
  metadata?: Prisma.InputJsonObject;
}): Prisma.ReportCreateManyInput {
  const createdAt = dateTime(args.createdAt);

  return {
    id: args.id,
    coachAccountId: args.coachAccountId,
    studentId: args.studentId,
    gameId: args.gameId,
    analysisId: args.analysisId,
    title: args.title,
    audience: args.audience,
    content: jsonObject({
      summary: args.summary,
      highlights: jsonArray(args.highlights),
      lessonFocus: jsonArray(args.lessonFocus),
      nextSteps: jsonArray(args.nextSteps),
      ...(args.metadata ? { metadata: args.metadata } : {}),
    }),
    promptVersion: GENERATED_PROMPT_VERSION,
    model: GENERATED_MODEL,
    createdAt,
    updatedAt: createdAt,
  };
}

function buildHomeworkRow(args: {
  id: string;
  coachAccountId: string;
  studentId: string;
  analysisId: string;
  title: string;
  createdAt: string;
  overview: string;
  exercises: string[];
  focusPoints: string[];
  notes: string[];
  metadata?: Prisma.InputJsonObject;
}): Prisma.HomeworkCreateManyInput {
  const createdAt = dateTime(args.createdAt);

  return {
    id: args.id,
    coachAccountId: args.coachAccountId,
    studentId: args.studentId,
    analysisId: args.analysisId,
    title: args.title,
    content: jsonObject({
      overview: args.overview,
      exercises: jsonArray(args.exercises),
      focusPoints: jsonArray(args.focusPoints),
      notes: jsonArray(args.notes),
      ...(args.metadata ? { metadata: args.metadata } : {}),
    }),
    promptVersion: GENERATED_PROMPT_VERSION,
    model: GENERATED_MODEL,
    createdAt,
    updatedAt: createdAt,
  };
}

function buildProgressSnapshotRow(args: {
  id: string;
  coachAccountId: string;
  studentId: string;
  analysisCount: number;
  createdAt: string;
  summary: string;
  improvements: string[];
  recurringWeaknesses: string[];
  nextFocusPoints: string[];
  confidenceLevel: ConfidenceLevel;
}): Prisma.ProgressSnapshotCreateManyInput {
  const createdAt = dateTime(args.createdAt);

  return {
    id: args.id,
    coachAccountId: args.coachAccountId,
    studentId: args.studentId,
    analysisCount: args.analysisCount,
    summary: jsonObject({
      summary: args.summary,
      improvements: jsonArray(args.improvements),
      recurringWeaknesses: jsonArray(args.recurringWeaknesses),
      nextFocusPoints: jsonArray(args.nextFocusPoints),
      confidenceLevel: args.confidenceLevel,
    }),
    promptVersion: GENERATED_PROMPT_VERSION,
    model: GENERATED_MODEL,
    createdAt,
    updatedAt: createdAt,
  };
}

function buildGenerationTraceRow(args: {
  id: string;
  coachAccountId: string;
  createdAt: string;
  analysisJobId: string | null;
  analysisId?: string;
  reportId?: string;
  homeworkId?: string;
  progressSnapshotId?: string;
  inputPayload: Prisma.InputJsonObject;
  outputPayload: Prisma.InputJsonObject;
  failureCode?: string;
  failureMessage?: string;
}): Prisma.GenerationTraceCreateManyInput {
  const createdAt = dateTime(args.createdAt);

  return {
    id: args.id,
    coachAccountId: args.coachAccountId,
    analysisJobId: args.analysisJobId,
    analysisId: args.analysisId ?? null,
    reportId: args.reportId ?? null,
    homeworkId: args.homeworkId ?? null,
    progressSnapshotId: args.progressSnapshotId ?? null,
    promptVersion: GENERATED_PROMPT_VERSION,
    model: GENERATED_MODEL,
    inputPayload: args.inputPayload,
    outputPayload: args.outputPayload,
    failureCode: args.failureCode ?? null,
    failureMessage: args.failureMessage ?? null,
    createdAt,
    updatedAt: createdAt,
  };
}

function buildDataset(coachAccountId: string): SeedDataset {
  const students = [
    {
      id: studentIds.anna,
      coachAccountId,
      displayName: 'Anna Complete',
      birthYear: 2012,
      rating: 1560,
      notes:
        'Strong practical fighter. Review candidate moves out loud before sharp middlegame turns.',
      archivedAt: null,
      createdAt: dateTime('2026-05-25T09:00:00.000Z'),
      updatedAt: dateTime('2026-08-10T15:30:00.000Z'),
    },
    {
      id: studentIds.boris,
      coachAccountId,
      displayName: 'Boris New',
      birthYear: 2015,
      rating: 980,
      notes: 'First lesson completed. No imported games yet.',
      archivedAt: null,
      createdAt: dateTime('2026-08-11T09:30:00.000Z'),
      updatedAt: dateTime('2026-08-11T09:30:00.000Z'),
    },
    {
      id: studentIds.clara,
      coachAccountId,
      displayName: 'Clara In Progress',
      birthYear: 2011,
      rating: 1425,
      notes: 'Two recent imports are still processing.',
      archivedAt: null,
      createdAt: dateTime('2026-07-20T11:00:00.000Z'),
      updatedAt: dateTime('2026-08-12T14:00:00.000Z'),
    },
    {
      id: studentIds.dmitry,
      coachAccountId,
      displayName: 'Dmitry Failed Retry',
      birthYear: 2010,
      rating: 1490,
      notes: 'Keep this profile for failed-job retry checks.',
      archivedAt: null,
      createdAt: dateTime('2026-06-18T10:00:00.000Z'),
      updatedAt: dateTime('2026-08-09T16:00:00.000Z'),
    },
    {
      id: studentIds.eva,
      coachAccountId,
      displayName: 'Eva Progress Gap',
      birthYear: 2013,
      rating: 1340,
      notes: 'Exactly two completed analyses. No progress snapshot on purpose.',
      archivedAt: null,
      createdAt: dateTime('2026-06-22T12:00:00.000Z'),
      updatedAt: dateTime('2026-08-08T18:00:00.000Z'),
    },
    {
      id: studentIds.fedor,
      coachAccountId,
      displayName: 'Fedor Archived',
      birthYear: 2009,
      rating: 1710,
      notes: 'Archived after summer camp block. Historical data stays visible.',
      archivedAt: dateTime('2026-08-05T10:00:00.000Z'),
      createdAt: dateTime('2026-04-12T08:30:00.000Z'),
      updatedAt: dateTime('2026-08-05T10:00:00.000Z'),
    },
  ] satisfies Prisma.StudentCreateManyInput[];

  const externalAccounts = [
    {
      id: 'seed-external-anna-lichess',
      studentId: studentIds.anna,
      platform: ExternalPlatform.LICHESS,
      username: 'anna_complete',
      createdAt: dateTime('2026-05-25T09:15:00.000Z'),
      updatedAt: dateTime('2026-05-25T09:15:00.000Z'),
    },
    {
      id: 'seed-external-anna-chesscom',
      studentId: studentIds.anna,
      platform: ExternalPlatform.CHESS_COM,
      username: 'AnnaCoachPrep',
      createdAt: dateTime('2026-05-25T09:16:00.000Z'),
      updatedAt: dateTime('2026-05-25T09:16:00.000Z'),
    },
  ] satisfies Prisma.ExternalAccountCreateManyInput[];

  const games = [
    buildGameRow({
      id: gameIds.anna1,
      coachAccountId,
      studentId: studentIds.anna,
      sourceType: GameSourceType.MANUAL_PGN,
      sourceLabel: 'Lesson import 1',
      studentColor: StudentColor.WHITE,
      event: 'City Junior League',
      site: 'Chess.com',
      whitePlayerName: 'Anna Complete',
      blackPlayerName: 'R. Smirnov',
      openingHeader: 'Italian Game',
      ecoCode: 'C50',
      rawResult: '0-1',
      derivedResult: GameResult.LOSS,
      plyCount: 46,
      hasEngineAnnotations: true,
      annotationCoverage: AnnotationCoverage.FULL,
      reducedConfidenceWarning: null,
      importedAt: '2026-06-18T09:00:00.000Z',
      pgnDate: '2026.06.18',
      moves:
        '1. e4 { [%eval 0.1] } e5 { [%eval 0.0] } 2. Nf3 { [%eval 0.2] } Nc6 { [%eval 0.1] } 3. Bc4 { [%eval 0.3] } Bc5 { [%eval 0.1] } 4. c3 { [%eval 0.2] } Nf6 { [%eval 0.1] } 5. d4 { [%eval -1.8] } exd4 { [%eval -2.0] }',
    }),
    buildGameRow({
      id: gameIds.anna2,
      coachAccountId,
      studentId: studentIds.anna,
      sourceType: GameSourceType.LICHESS_IMPORT,
      sourceLabel: 'Lichess arena import',
      studentColor: StudentColor.BLACK,
      event: 'Evening Arena',
      site: 'Lichess',
      whitePlayerName: 'speedstudy',
      blackPlayerName: 'anna_complete',
      openingHeader: 'French Defense',
      ecoCode: 'C02',
      rawResult: '1/2-1/2',
      derivedResult: GameResult.DRAW,
      plyCount: 62,
      hasEngineAnnotations: true,
      annotationCoverage: AnnotationCoverage.PARTIAL,
      reducedConfidenceWarning:
        'Sparse annotations after move 24 reduce confidence in the final phase.',
      importedAt: '2026-07-02T12:00:00.000Z',
      pgnDate: '2026.07.02',
      moves:
        '1. e4 { [%eval 0.0] } e6 { [%eval 0.0] } 2. d4 { [%eval 0.1] } d5 { [%eval 0.0] } 3. Nc3 { [%eval 0.1] } Bb4 { [%eval 0.0] } 4. e5 { [%eval 0.2] } c5 { [%eval 0.1] } 5. a3 { [%eval -0.6] } Bxc3+ { [%eval -0.7] }',
    }),
    buildGameRow({
      id: gameIds.anna3,
      coachAccountId,
      studentId: studentIds.anna,
      sourceType: GameSourceType.MANUAL_PGN,
      sourceLabel: 'Lesson import 2',
      studentColor: StudentColor.WHITE,
      event: 'Training Match',
      site: 'Club Room',
      whitePlayerName: 'Anna Complete',
      blackPlayerName: 'Coach Sparring',
      openingHeader: 'Caro-Kann Defense',
      ecoCode: 'B10',
      rawResult: '1-0',
      derivedResult: GameResult.WIN,
      plyCount: 38,
      hasEngineAnnotations: true,
      annotationCoverage: AnnotationCoverage.FULL,
      reducedConfidenceWarning: null,
      importedAt: '2026-07-18T15:00:00.000Z',
      pgnDate: '2026.07.18',
      moves:
        '1. e4 { [%eval 0.2] } c6 { [%eval 0.1] } 2. d4 { [%eval 0.2] } d5 { [%eval 0.1] } 3. Nc3 { [%eval 0.3] } dxe4 { [%eval 0.2] } 4. Nxe4 { [%eval 0.4] } Bf5 { [%eval 0.2] } 5. Ng3 { [%eval 0.6] } Bg6 { [%eval 0.3] }',
    }),
    buildGameRow({
      id: gameIds.anna4,
      coachAccountId,
      studentId: studentIds.anna,
      sourceType: GameSourceType.MANUAL_PGN,
      sourceLabel: 'Weekend swiss',
      studentColor: StudentColor.BLACK,
      event: 'Weekend Swiss',
      site: 'Moscow',
      whitePlayerName: 'A. Kovalev',
      blackPlayerName: 'Anna Complete',
      openingHeader: "Queen's Gambit Declined",
      ecoCode: 'D30',
      rawResult: '1-0',
      derivedResult: GameResult.LOSS,
      plyCount: 54,
      hasEngineAnnotations: true,
      annotationCoverage: AnnotationCoverage.FULL,
      reducedConfidenceWarning: null,
      importedAt: '2026-07-30T10:00:00.000Z',
      pgnDate: '2026.07.30',
      moves:
        '1. d4 { [%eval 0.0] } d5 { [%eval 0.0] } 2. c4 { [%eval 0.1] } e6 { [%eval 0.0] } 3. Nc3 { [%eval 0.1] } Nf6 { [%eval 0.0] } 4. Bg5 { [%eval 0.2] } Be7 { [%eval 0.1] } 5. e3 { [%eval 0.2] } O-O { [%eval 0.1] }',
    }),
    buildGameRow({
      id: gameIds.anna5,
      coachAccountId,
      studentId: studentIds.anna,
      sourceType: GameSourceType.LICHESS_IMPORT,
      sourceLabel: 'Lichess practice set',
      studentColor: StudentColor.WHITE,
      event: 'Practice Rapid',
      site: 'Lichess',
      whitePlayerName: 'anna_complete',
      blackPlayerName: 'tacticalfox',
      openingHeader: 'Sicilian Defense',
      ecoCode: 'B23',
      rawResult: '1-0',
      derivedResult: GameResult.WIN,
      plyCount: 40,
      hasEngineAnnotations: true,
      annotationCoverage: AnnotationCoverage.FULL,
      reducedConfidenceWarning: null,
      importedAt: '2026-08-10T14:00:00.000Z',
      pgnDate: '2026.08.10',
      moves:
        '1. e4 { [%eval 0.1] } c5 { [%eval 0.0] } 2. Nc3 { [%eval 0.2] } Nc6 { [%eval 0.0] } 3. f4 { [%eval 0.3] } g6 { [%eval 0.1] } 4. Nf3 { [%eval 0.5] } Bg7 { [%eval 0.2] } 5. Bb5 { [%eval 0.7] } Nd4 { [%eval 0.3] }',
    }),
    buildGameRow({
      id: gameIds.anna6,
      coachAccountId,
      studentId: studentIds.anna,
      sourceType: GameSourceType.MANUAL_PGN,
      sourceLabel: 'Notebook import',
      studentColor: StudentColor.BLACK,
      event: 'Club Training',
      site: 'School Club',
      whitePlayerName: 'P. Levin',
      blackPlayerName: 'Anna Complete',
      openingHeader: 'London System',
      ecoCode: 'D02',
      rawResult: '1/2-1/2',
      derivedResult: GameResult.DRAW,
      plyCount: 34,
      hasEngineAnnotations: false,
      annotationCoverage: AnnotationCoverage.NONE,
      reducedConfidenceWarning: null,
      importedAt: '2026-08-11T17:00:00.000Z',
      pgnDate: '2026.08.11',
      moves:
        '1. d4 d5 2. Nf3 Nf6 3. Bf4 e6 4. e3 Bd6 5. Bg3 O-O 6. Bd3 c5 7. c3 Nc6',
    }),
    buildGameRow({
      id: gameIds.anna7,
      coachAccountId,
      studentId: studentIds.anna,
      sourceType: GameSourceType.MANUAL_PGN,
      sourceLabel: 'Fresh upload',
      studentColor: StudentColor.WHITE,
      event: 'Unrated sparring',
      site: 'Club Room',
      whitePlayerName: 'Anna Complete',
      blackPlayerName: 'Guest Player',
      openingHeader: 'English Opening',
      ecoCode: 'A22',
      rawResult: '*',
      derivedResult: GameResult.UNKNOWN,
      plyCount: 22,
      hasEngineAnnotations: false,
      annotationCoverage: AnnotationCoverage.NONE,
      reducedConfidenceWarning: null,
      importedAt: '2026-08-12T09:00:00.000Z',
      pgnDate: '2026.08.12',
      moves: '1. c4 e5 2. Nc3 Nf6 3. g3 d5 4. cxd5 Nxd5 5. Bg2 Nb6 6. Nf3 Nc6',
    }),
    buildGameRow({
      id: gameIds.clara1,
      coachAccountId,
      studentId: studentIds.clara,
      sourceType: GameSourceType.MANUAL_PGN,
      sourceLabel: 'Annotated upload A',
      studentColor: StudentColor.WHITE,
      event: 'League Round',
      site: 'Chess.com',
      whitePlayerName: 'Clara In Progress',
      blackPlayerName: 'M. Denisov',
      openingHeader: 'Scotch Game',
      ecoCode: 'C44',
      rawResult: '1-0',
      derivedResult: GameResult.WIN,
      plyCount: 28,
      hasEngineAnnotations: true,
      annotationCoverage: AnnotationCoverage.FULL,
      reducedConfidenceWarning: null,
      importedAt: '2026-08-12T08:30:00.000Z',
      pgnDate: '2026.08.12',
      moves:
        '1. e4 { [%eval 0.2] } e5 { [%eval 0.1] } 2. Nf3 { [%eval 0.2] } Nc6 { [%eval 0.1] } 3. d4 { [%eval 0.3] } exd4 { [%eval 0.2] }',
    }),
    buildGameRow({
      id: gameIds.clara2,
      coachAccountId,
      studentId: studentIds.clara,
      sourceType: GameSourceType.MANUAL_PGN,
      sourceLabel: 'Annotated upload B',
      studentColor: StudentColor.BLACK,
      event: 'School Match',
      site: 'Lichess',
      whitePlayerName: 'studytime',
      blackPlayerName: 'Clara In Progress',
      openingHeader: 'Pirc Defense',
      ecoCode: 'B08',
      rawResult: '0-1',
      derivedResult: GameResult.WIN,
      plyCount: 36,
      hasEngineAnnotations: true,
      annotationCoverage: AnnotationCoverage.PARTIAL,
      reducedConfidenceWarning:
        'Only the tactical phase contains engine comments.',
      importedAt: '2026-08-11T18:00:00.000Z',
      pgnDate: '2026.08.11',
      moves:
        '1. e4 { [%eval 0.1] } d6 { [%eval 0.0] } 2. d4 { [%eval 0.1] } Nf6 { [%eval 0.0] } 3. Nc3 { [%eval 0.2] } g6 { [%eval 0.0] }',
    }),
    buildGameRow({
      id: gameIds.dmitry1,
      coachAccountId,
      studentId: studentIds.dmitry,
      sourceType: GameSourceType.MANUAL_PGN,
      sourceLabel: 'Reliable completed sample',
      studentColor: StudentColor.WHITE,
      event: 'Training Ladder',
      site: 'Club Room',
      whitePlayerName: 'Dmitry Failed Retry',
      blackPlayerName: 'Coach Sparring',
      openingHeader: 'Vienna Game',
      ecoCode: 'C27',
      rawResult: '1-0',
      derivedResult: GameResult.WIN,
      plyCount: 30,
      hasEngineAnnotations: true,
      annotationCoverage: AnnotationCoverage.FULL,
      reducedConfidenceWarning: null,
      importedAt: '2026-08-03T10:00:00.000Z',
      pgnDate: '2026.08.03',
      moves:
        '1. e4 { [%eval 0.1] } e5 { [%eval 0.0] } 2. Nc3 { [%eval 0.2] } Nf6 { [%eval 0.0] } 3. f4 { [%eval 0.3] } d5 { [%eval 0.1] }',
    }),
    buildGameRow({
      id: gameIds.dmitry2,
      coachAccountId,
      studentId: studentIds.dmitry,
      sourceType: GameSourceType.MANUAL_PGN,
      sourceLabel: 'Failure case import',
      studentColor: StudentColor.BLACK,
      event: 'Weekend Team Match',
      site: 'Chess.com',
      whitePlayerName: 'quietgrinder',
      blackPlayerName: 'Dmitry Failed Retry',
      openingHeader: 'Slav Defense',
      ecoCode: 'D10',
      rawResult: '1-0',
      derivedResult: GameResult.LOSS,
      plyCount: 44,
      hasEngineAnnotations: true,
      annotationCoverage: AnnotationCoverage.FULL,
      reducedConfidenceWarning: null,
      importedAt: '2026-08-09T13:00:00.000Z',
      pgnDate: '2026.08.09',
      moves:
        '1. d4 { [%eval 0.0] } d5 { [%eval 0.0] } 2. c4 { [%eval 0.1] } c6 { [%eval 0.0] } 3. Nf3 { [%eval 0.1] } Nf6 { [%eval 0.0] }',
    }),
    buildGameRow({
      id: gameIds.eva1,
      coachAccountId,
      studentId: studentIds.eva,
      sourceType: GameSourceType.MANUAL_PGN,
      sourceLabel: 'Camp round 1',
      studentColor: StudentColor.WHITE,
      event: 'Summer Camp',
      site: 'Camp Hall',
      whitePlayerName: 'Eva Progress Gap',
      blackPlayerName: 'N. Petrova',
      openingHeader: "Queen's Pawn Game",
      ecoCode: 'D00',
      rawResult: '1/2-1/2',
      derivedResult: GameResult.DRAW,
      plyCount: 48,
      hasEngineAnnotations: true,
      annotationCoverage: AnnotationCoverage.FULL,
      reducedConfidenceWarning: null,
      importedAt: '2026-07-25T10:00:00.000Z',
      pgnDate: '2026.07.25',
      moves:
        '1. d4 { [%eval 0.0] } d5 { [%eval 0.0] } 2. Nf3 { [%eval 0.1] } Nf6 { [%eval 0.0] } 3. e3 { [%eval 0.1] } e6 { [%eval 0.0] }',
    }),
    buildGameRow({
      id: gameIds.eva2,
      coachAccountId,
      studentId: studentIds.eva,
      sourceType: GameSourceType.LICHESS_IMPORT,
      sourceLabel: 'Lichess practice',
      studentColor: StudentColor.BLACK,
      event: 'Rapid Arena',
      site: 'Lichess',
      whitePlayerName: 'forkhunter',
      blackPlayerName: 'Eva Progress Gap',
      openingHeader: 'Caro-Kann Defense',
      ecoCode: 'B18',
      rawResult: '0-1',
      derivedResult: GameResult.WIN,
      plyCount: 42,
      hasEngineAnnotations: true,
      annotationCoverage: AnnotationCoverage.FULL,
      reducedConfidenceWarning: null,
      importedAt: '2026-08-08T17:00:00.000Z',
      pgnDate: '2026.08.08',
      moves:
        '1. e4 { [%eval 0.1] } c6 { [%eval 0.0] } 2. d4 { [%eval 0.2] } d5 { [%eval 0.0] } 3. Nc3 { [%eval 0.2] } dxe4 { [%eval 0.1] }',
    }),
    buildGameRow({
      id: gameIds.fedor1,
      coachAccountId,
      studentId: studentIds.fedor,
      sourceType: GameSourceType.MANUAL_PGN,
      sourceLabel: 'Spring tournament',
      studentColor: StudentColor.WHITE,
      event: 'Spring Open',
      site: 'Moscow',
      whitePlayerName: 'Fedor Archived',
      blackPlayerName: 'I. Gromov',
      openingHeader: 'Ruy Lopez',
      ecoCode: 'C68',
      rawResult: '1-0',
      derivedResult: GameResult.WIN,
      plyCount: 52,
      hasEngineAnnotations: true,
      annotationCoverage: AnnotationCoverage.FULL,
      reducedConfidenceWarning: null,
      importedAt: '2026-05-28T09:00:00.000Z',
      pgnDate: '2026.05.28',
      moves:
        '1. e4 { [%eval 0.1] } e5 { [%eval 0.0] } 2. Nf3 { [%eval 0.2] } Nc6 { [%eval 0.0] } 3. Bb5 { [%eval 0.3] } a6 { [%eval 0.1] }',
    }),
    buildGameRow({
      id: gameIds.fedor2,
      coachAccountId,
      studentId: studentIds.fedor,
      sourceType: GameSourceType.MANUAL_PGN,
      sourceLabel: 'Spring tournament',
      studentColor: StudentColor.BLACK,
      event: 'Spring Open',
      site: 'Moscow',
      whitePlayerName: 'S. Morozov',
      blackPlayerName: 'Fedor Archived',
      openingHeader: 'Nimzo-Indian Defense',
      ecoCode: 'E32',
      rawResult: '1/2-1/2',
      derivedResult: GameResult.DRAW,
      plyCount: 60,
      hasEngineAnnotations: true,
      annotationCoverage: AnnotationCoverage.PARTIAL,
      reducedConfidenceWarning:
        'Endgame annotations stop abruptly after move 32.',
      importedAt: '2026-06-14T13:30:00.000Z',
      pgnDate: '2026.06.14',
      moves:
        '1. d4 { [%eval 0.0] } Nf6 { [%eval 0.0] } 2. c4 { [%eval 0.1] } e6 { [%eval 0.0] } 3. Nc3 { [%eval 0.1] } Bb4 { [%eval 0.0] }',
    }),
    buildGameRow({
      id: gameIds.fedor3,
      coachAccountId,
      studentId: studentIds.fedor,
      sourceType: GameSourceType.LICHESS_IMPORT,
      sourceLabel: 'Last active ladder game',
      studentColor: StudentColor.WHITE,
      event: 'Club Ladder',
      site: 'Lichess',
      whitePlayerName: 'Fedor Archived',
      blackPlayerName: 'endgamesharp',
      openingHeader: 'Catalan Opening',
      ecoCode: 'E04',
      rawResult: '0-1',
      derivedResult: GameResult.LOSS,
      plyCount: 58,
      hasEngineAnnotations: true,
      annotationCoverage: AnnotationCoverage.FULL,
      reducedConfidenceWarning: null,
      importedAt: '2026-07-09T15:00:00.000Z',
      pgnDate: '2026.07.09',
      moves:
        '1. d4 { [%eval 0.1] } Nf6 { [%eval 0.0] } 2. c4 { [%eval 0.2] } e6 { [%eval 0.0] } 3. g3 { [%eval 0.2] } d5 { [%eval 0.1] }',
    }),
  ];

  const analysisJobs = [
    buildAnalysisJobRow({
      id: jobIds.annaAnalysis1,
      coachAccountId,
      studentId: studentIds.anna,
      gameId: gameIds.anna1,
      jobType: AnalysisJobType.ANALYSIS,
      status: AnalysisJobStatus.COMPLETED,
      progressPercent: 100,
      startedAt: '2026-06-18T09:05:00.000Z',
      completedAt: '2026-06-18T09:12:00.000Z',
      createdAt: '2026-06-18T09:04:00.000Z',
    }),
    buildAnalysisJobRow({
      id: jobIds.annaAnalysis2,
      coachAccountId,
      studentId: studentIds.anna,
      gameId: gameIds.anna2,
      jobType: AnalysisJobType.ANALYSIS,
      status: AnalysisJobStatus.COMPLETED,
      progressPercent: 100,
      startedAt: '2026-07-02T12:05:00.000Z',
      completedAt: '2026-07-02T12:13:00.000Z',
      createdAt: '2026-07-02T12:04:00.000Z',
    }),
    buildAnalysisJobRow({
      id: jobIds.annaAnalysis3,
      coachAccountId,
      studentId: studentIds.anna,
      gameId: gameIds.anna3,
      jobType: AnalysisJobType.ANALYSIS,
      status: AnalysisJobStatus.COMPLETED,
      progressPercent: 100,
      startedAt: '2026-07-18T15:05:00.000Z',
      completedAt: '2026-07-18T15:11:00.000Z',
      createdAt: '2026-07-18T15:04:00.000Z',
    }),
    buildAnalysisJobRow({
      id: jobIds.annaAnalysis4,
      coachAccountId,
      studentId: studentIds.anna,
      gameId: gameIds.anna4,
      jobType: AnalysisJobType.ANALYSIS,
      status: AnalysisJobStatus.COMPLETED,
      progressPercent: 100,
      startedAt: '2026-07-30T10:05:00.000Z',
      completedAt: '2026-07-30T10:13:00.000Z',
      createdAt: '2026-07-30T10:04:00.000Z',
    }),
    buildAnalysisJobRow({
      id: jobIds.annaAnalysis5,
      coachAccountId,
      studentId: studentIds.anna,
      gameId: gameIds.anna5,
      jobType: AnalysisJobType.ANALYSIS,
      status: AnalysisJobStatus.COMPLETED,
      progressPercent: 100,
      startedAt: '2026-08-10T14:05:00.000Z',
      completedAt: '2026-08-10T14:14:00.000Z',
      createdAt: '2026-08-10T14:04:00.000Z',
    }),
    buildAnalysisJobRow({
      id: jobIds.annaReportCoach,
      coachAccountId,
      studentId: studentIds.anna,
      gameId: gameIds.anna5,
      jobType: AnalysisJobType.REPORT_GENERATION,
      sourceAnalysisId: analysisIds.anna5,
      reportAudience: ReportAudience.COACH,
      status: AnalysisJobStatus.COMPLETED,
      progressPercent: 100,
      startedAt: '2026-08-10T14:20:00.000Z',
      completedAt: '2026-08-10T14:21:30.000Z',
      createdAt: '2026-08-10T14:19:00.000Z',
    }),
    buildAnalysisJobRow({
      id: jobIds.annaReportParent,
      coachAccountId,
      studentId: studentIds.anna,
      gameId: gameIds.anna4,
      jobType: AnalysisJobType.REPORT_GENERATION,
      sourceAnalysisId: analysisIds.anna4,
      reportAudience: ReportAudience.PARENT,
      status: AnalysisJobStatus.COMPLETED,
      progressPercent: 100,
      startedAt: '2026-08-01T08:10:00.000Z',
      completedAt: '2026-08-01T08:12:00.000Z',
      createdAt: '2026-08-01T08:09:00.000Z',
    }),
    buildAnalysisJobRow({
      id: jobIds.annaHomework1,
      coachAccountId,
      studentId: studentIds.anna,
      gameId: gameIds.anna5,
      jobType: AnalysisJobType.HOMEWORK_GENERATION,
      sourceAnalysisId: analysisIds.anna5,
      status: AnalysisJobStatus.COMPLETED,
      progressPercent: 100,
      startedAt: '2026-08-10T14:24:00.000Z',
      completedAt: '2026-08-10T14:25:30.000Z',
      createdAt: '2026-08-10T14:23:00.000Z',
    }),
    buildAnalysisJobRow({
      id: jobIds.annaHomework2,
      coachAccountId,
      studentId: studentIds.anna,
      gameId: gameIds.anna3,
      jobType: AnalysisJobType.HOMEWORK_GENERATION,
      sourceAnalysisId: analysisIds.anna3,
      status: AnalysisJobStatus.COMPLETED,
      progressPercent: 100,
      startedAt: '2026-07-19T09:10:00.000Z',
      completedAt: '2026-07-19T09:12:00.000Z',
      createdAt: '2026-07-19T09:09:00.000Z',
    }),
    buildAnalysisJobRow({
      id: jobIds.annaProgress,
      coachAccountId,
      studentId: studentIds.anna,
      gameId: gameIds.anna5,
      jobType: AnalysisJobType.PROGRESS_GENERATION,
      status: AnalysisJobStatus.COMPLETED,
      progressPercent: 100,
      startedAt: '2026-08-10T14:28:00.000Z',
      completedAt: '2026-08-10T14:29:30.000Z',
      createdAt: '2026-08-10T14:27:00.000Z',
    }),
    buildAnalysisJobRow({
      id: jobIds.claraAnalysis1,
      coachAccountId,
      studentId: studentIds.clara,
      gameId: gameIds.clara1,
      jobType: AnalysisJobType.ANALYSIS,
      status: AnalysisJobStatus.PARSING,
      progressPercent: 15,
      startedAt: '2026-08-12T08:35:00.000Z',
      createdAt: '2026-08-12T08:34:00.000Z',
    }),
    buildAnalysisJobRow({
      id: jobIds.claraAnalysis2,
      coachAccountId,
      studentId: studentIds.clara,
      gameId: gameIds.clara2,
      jobType: AnalysisJobType.ANALYSIS,
      status: AnalysisJobStatus.CLASSIFICATION,
      progressPercent: 68,
      startedAt: '2026-08-11T18:05:00.000Z',
      createdAt: '2026-08-11T18:04:00.000Z',
    }),
    buildAnalysisJobRow({
      id: jobIds.dmitryAnalysisCompleted,
      coachAccountId,
      studentId: studentIds.dmitry,
      gameId: gameIds.dmitry1,
      jobType: AnalysisJobType.ANALYSIS,
      status: AnalysisJobStatus.COMPLETED,
      progressPercent: 100,
      startedAt: '2026-08-03T10:04:00.000Z',
      completedAt: '2026-08-03T10:10:00.000Z',
      createdAt: '2026-08-03T10:03:00.000Z',
    }),
    buildAnalysisJobRow({
      id: jobIds.dmitryAnalysisFailed,
      coachAccountId,
      studentId: studentIds.dmitry,
      gameId: gameIds.dmitry2,
      jobType: AnalysisJobType.ANALYSIS,
      status: AnalysisJobStatus.FAILED,
      attemptCount: 1,
      progressPercent: 32,
      failureCode: 'PGN_PARSE_TIMEOUT',
      failureMessage:
        'Annotated move parsing timed out while extracting comments.',
      startedAt: '2026-08-09T13:04:00.000Z',
      completedAt: '2026-08-09T13:08:00.000Z',
      createdAt: '2026-08-09T13:03:00.000Z',
    }),
    buildAnalysisJobRow({
      id: jobIds.dmitryReportFailed,
      coachAccountId,
      studentId: studentIds.dmitry,
      gameId: gameIds.dmitry1,
      jobType: AnalysisJobType.REPORT_GENERATION,
      sourceAnalysisId: analysisIds.dmitry1,
      reportAudience: ReportAudience.COACH,
      status: AnalysisJobStatus.FAILED,
      attemptCount: 1,
      progressPercent: 100,
      failureCode: 'LLM_RATE_LIMIT',
      failureMessage: 'Temporary model rate limit while generating the report.',
      startedAt: '2026-08-09T13:20:00.000Z',
      completedAt: '2026-08-09T13:21:00.000Z',
      createdAt: '2026-08-09T13:19:00.000Z',
    }),
    buildAnalysisJobRow({
      id: jobIds.evaAnalysis1,
      coachAccountId,
      studentId: studentIds.eva,
      gameId: gameIds.eva1,
      jobType: AnalysisJobType.ANALYSIS,
      status: AnalysisJobStatus.COMPLETED,
      progressPercent: 100,
      startedAt: '2026-07-25T10:04:00.000Z',
      completedAt: '2026-07-25T10:11:00.000Z',
      createdAt: '2026-07-25T10:03:00.000Z',
    }),
    buildAnalysisJobRow({
      id: jobIds.evaAnalysis2,
      coachAccountId,
      studentId: studentIds.eva,
      gameId: gameIds.eva2,
      jobType: AnalysisJobType.ANALYSIS,
      status: AnalysisJobStatus.COMPLETED,
      progressPercent: 100,
      startedAt: '2026-08-08T17:04:00.000Z',
      completedAt: '2026-08-08T17:10:00.000Z',
      createdAt: '2026-08-08T17:03:00.000Z',
    }),
    buildAnalysisJobRow({
      id: jobIds.fedorAnalysis1,
      coachAccountId,
      studentId: studentIds.fedor,
      gameId: gameIds.fedor1,
      jobType: AnalysisJobType.ANALYSIS,
      status: AnalysisJobStatus.COMPLETED,
      progressPercent: 100,
      startedAt: '2026-05-28T09:04:00.000Z',
      completedAt: '2026-05-28T09:11:00.000Z',
      createdAt: '2026-05-28T09:03:00.000Z',
    }),
    buildAnalysisJobRow({
      id: jobIds.fedorAnalysis2,
      coachAccountId,
      studentId: studentIds.fedor,
      gameId: gameIds.fedor2,
      jobType: AnalysisJobType.ANALYSIS,
      status: AnalysisJobStatus.COMPLETED,
      progressPercent: 100,
      startedAt: '2026-06-14T13:35:00.000Z',
      completedAt: '2026-06-14T13:43:00.000Z',
      createdAt: '2026-06-14T13:34:00.000Z',
    }),
    buildAnalysisJobRow({
      id: jobIds.fedorAnalysis3,
      coachAccountId,
      studentId: studentIds.fedor,
      gameId: gameIds.fedor3,
      jobType: AnalysisJobType.ANALYSIS,
      status: AnalysisJobStatus.COMPLETED,
      progressPercent: 100,
      startedAt: '2026-07-09T15:04:00.000Z',
      completedAt: '2026-07-09T15:12:00.000Z',
      createdAt: '2026-07-09T15:03:00.000Z',
    }),
    buildAnalysisJobRow({
      id: jobIds.fedorReport,
      coachAccountId,
      studentId: studentIds.fedor,
      gameId: gameIds.fedor3,
      jobType: AnalysisJobType.REPORT_GENERATION,
      sourceAnalysisId: analysisIds.fedor3,
      reportAudience: ReportAudience.COACH,
      status: AnalysisJobStatus.COMPLETED,
      progressPercent: 100,
      startedAt: '2026-07-10T09:05:00.000Z',
      completedAt: '2026-07-10T09:06:30.000Z',
      createdAt: '2026-07-10T09:04:00.000Z',
    }),
    buildAnalysisJobRow({
      id: jobIds.fedorHomework,
      coachAccountId,
      studentId: studentIds.fedor,
      gameId: gameIds.fedor2,
      jobType: AnalysisJobType.HOMEWORK_GENERATION,
      sourceAnalysisId: analysisIds.fedor2,
      status: AnalysisJobStatus.COMPLETED,
      progressPercent: 100,
      startedAt: '2026-06-15T08:05:00.000Z',
      completedAt: '2026-06-15T08:07:00.000Z',
      createdAt: '2026-06-15T08:04:00.000Z',
    }),
    buildAnalysisJobRow({
      id: jobIds.fedorProgress,
      coachAccountId,
      studentId: studentIds.fedor,
      gameId: gameIds.fedor3,
      jobType: AnalysisJobType.PROGRESS_GENERATION,
      status: AnalysisJobStatus.COMPLETED,
      progressPercent: 100,
      startedAt: '2026-07-10T09:10:00.000Z',
      completedAt: '2026-07-10T09:11:30.000Z',
      createdAt: '2026-07-10T09:09:00.000Z',
    }),
  ];

  const analyses = [
    buildAnalysisRow({
      id: analysisIds.anna1,
      coachAccountId,
      studentId: studentIds.anna,
      gameId: gameIds.anna1,
      analysisJobId: jobIds.annaAnalysis1,
      createdAt: '2026-06-18T09:12:00.000Z',
      confidenceLevel: ConfidenceLevel.MEDIUM,
      overallDiagnosis:
        'Anna found active ideas but repeatedly allowed forcing tactical shots against her king.',
      openingName: 'Italian Game',
      result: GameResult.LOSS,
      mainWeaknessTag: WeaknessTag.KING_SAFETY,
      secondaryWeaknessTags: [
        WeaknessTag.CALCULATION_DEPTH,
        WeaknessTag.MISSED_OPPONENT_THREAT,
      ],
      recommendedLessonTitle: 'Spot the opponent forcing move',
      recommendedLessonWhy:
        'Several candidate moves ignored direct checks and discovered attacks.',
      recommendedFocusPoints: [
        'List opponent checks before every commitment',
        'Pause after each pawn break near the king',
      ],
      rawExtractedContext: jsonObject({
        annotationCoverage: AnnotationCoverage.FULL,
        reducedConfidenceWarning: null,
      }),
      rawAnalysisJson: jsonObject({
        source: 'seed',
        scenario: 'anna-complete',
        severeMistakeCount: 4,
      }),
    }),
    buildAnalysisRow({
      id: analysisIds.anna2,
      coachAccountId,
      studentId: studentIds.anna,
      gameId: gameIds.anna2,
      analysisJobId: jobIds.annaAnalysis2,
      createdAt: '2026-07-02T12:13:00.000Z',
      confidenceLevel: ConfidenceLevel.LOW,
      overallDiagnosis:
        'The middlegame plan was solid, but partial annotations hide key endgame choices.',
      openingName: 'French Defense',
      result: GameResult.DRAW,
      mainWeaknessTag: WeaknessTag.TIME_MANAGEMENT,
      secondaryWeaknessTags: [
        WeaknessTag.REDUCED_CONFIDENCE,
        WeaknessTag.PAWN_STRUCTURE,
      ],
      recommendedLessonTitle: 'Convert equal endings without rushing',
      recommendedLessonWhy:
        'The position stayed playable, but clock pressure caused inaccurate simplifications.',
      recommendedFocusPoints: [
        'Use a 30-second blunder scan before trading queens',
        'Compare pawn-structure plans before committing',
      ],
      rawExtractedContext: jsonObject({
        annotationCoverage: AnnotationCoverage.PARTIAL,
        reducedConfidenceWarning:
          'Sparse annotations after move 24 reduce confidence in the final phase.',
      }),
      rawAnalysisJson: jsonObject({
        source: 'seed',
        scenario: 'anna-complete',
        severeMistakeCount: 3,
      }),
    }),
    buildAnalysisRow({
      id: analysisIds.anna3,
      coachAccountId,
      studentId: studentIds.anna,
      gameId: gameIds.anna3,
      analysisJobId: jobIds.annaAnalysis3,
      createdAt: '2026-07-18T15:11:00.000Z',
      confidenceLevel: ConfidenceLevel.HIGH,
      overallDiagnosis:
        'Piece activity improved, and the tactical misses were smaller and easier to correct.',
      openingName: 'Caro-Kann Defense',
      result: GameResult.WIN,
      mainWeaknessTag: WeaknessTag.CALCULATION_DEPTH,
      secondaryWeaknessTags: [
        WeaknessTag.MISSED_FORK,
        WeaknessTag.OPENING_STRATEGY,
      ],
      recommendedLessonTitle: 'Calculate forcing continuations to the end',
      recommendedLessonWhy:
        'Anna often saw the first tactic but stopped one move too early.',
      recommendedFocusPoints: [
        'Extend calculation one reply deeper',
        'State the tactical motif before moving',
      ],
      rawExtractedContext: jsonObject({
        annotationCoverage: AnnotationCoverage.FULL,
        reducedConfidenceWarning: null,
      }),
      rawAnalysisJson: jsonObject({
        source: 'seed',
        scenario: 'anna-complete',
        severeMistakeCount: 2,
      }),
    }),
    buildAnalysisRow({
      id: analysisIds.anna4,
      coachAccountId,
      studentId: studentIds.anna,
      gameId: gameIds.anna4,
      analysisJobId: jobIds.annaAnalysis4,
      createdAt: '2026-07-30T10:13:00.000Z',
      confidenceLevel: ConfidenceLevel.HIGH,
      overallDiagnosis:
        'The defensive structure held together longer, with only one major tactical collapse late in the game.',
      openingName: "Queen's Gambit Declined",
      result: GameResult.LOSS,
      mainWeaknessTag: WeaknessTag.MISSED_OPPONENT_THREAT,
      secondaryWeaknessTags: [
        WeaknessTag.CALCULATION_DEPTH,
        WeaknessTag.TIME_MANAGEMENT,
      ],
      recommendedLessonTitle: 'Threat recognition under pressure',
      recommendedLessonWhy:
        'Late middlegame threats were visible but not prioritized quickly enough.',
      recommendedFocusPoints: [
        'Write down the opponent threat in post-game review',
        'Check loose back-rank squares first',
      ],
      rawExtractedContext: jsonObject({
        annotationCoverage: AnnotationCoverage.FULL,
        reducedConfidenceWarning: null,
      }),
      rawAnalysisJson: jsonObject({
        source: 'seed',
        scenario: 'anna-complete',
        severeMistakeCount: 1,
      }),
    }),
    buildAnalysisRow({
      id: analysisIds.anna5,
      coachAccountId,
      studentId: studentIds.anna,
      gameId: gameIds.anna5,
      analysisJobId: jobIds.annaAnalysis5,
      createdAt: '2026-08-10T14:14:00.000Z',
      confidenceLevel: ConfidenceLevel.HIGH,
      overallDiagnosis:
        'The latest game shows calmer calculation and cleaner conversion after the opening initiative.',
      openingName: 'Sicilian Defense',
      result: GameResult.WIN,
      mainWeaknessTag: WeaknessTag.CALCULATION_DEPTH,
      secondaryWeaknessTags: [
        WeaknessTag.POOR_CONVERSION,
        WeaknessTag.TIME_MANAGEMENT,
      ],
      recommendedLessonTitle: 'Convert initiative into concrete gain',
      recommendedLessonWhy:
        'The attack was promising early; the next step is converting that pressure more directly.',
      recommendedFocusPoints: [
        'Turn activity into material or king safety targets',
        'Count forcing moves before simplifying',
      ],
      rawExtractedContext: jsonObject({
        annotationCoverage: AnnotationCoverage.FULL,
        reducedConfidenceWarning: null,
      }),
      rawAnalysisJson: jsonObject({
        source: 'seed',
        scenario: 'anna-complete',
        severeMistakeCount: 0,
      }),
    }),
    buildAnalysisRow({
      id: analysisIds.dmitry1,
      coachAccountId,
      studentId: studentIds.dmitry,
      gameId: gameIds.dmitry1,
      analysisJobId: jobIds.dmitryAnalysisCompleted,
      createdAt: '2026-08-03T10:10:00.000Z',
      confidenceLevel: ConfidenceLevel.HIGH,
      overallDiagnosis:
        'The winning attack was direct, but calculation discipline still slipped in one forcing line.',
      openingName: 'Vienna Game',
      result: GameResult.WIN,
      mainWeaknessTag: WeaknessTag.CALCULATION_DEPTH,
      secondaryWeaknessTags: [WeaknessTag.MISSED_CAPTURE],
      recommendedLessonTitle: 'Finish the tactical line',
      recommendedLessonWhy:
        'The attack worked, but a cleaner continuation was available.',
      recommendedFocusPoints: [
        'Check tactical captures before quiet improving moves',
      ],
      rawExtractedContext: jsonObject({
        annotationCoverage: AnnotationCoverage.FULL,
        reducedConfidenceWarning: null,
      }),
      rawAnalysisJson: jsonObject({
        source: 'seed',
        scenario: 'dmitry-failed-retry',
      }),
    }),
    buildAnalysisRow({
      id: analysisIds.eva1,
      coachAccountId,
      studentId: studentIds.eva,
      gameId: gameIds.eva1,
      analysisJobId: jobIds.evaAnalysis1,
      createdAt: '2026-07-25T10:11:00.000Z',
      confidenceLevel: ConfidenceLevel.HIGH,
      overallDiagnosis:
        'Solid structure and patience, but tactical follow-up after gaining space remains shallow.',
      openingName: "Queen's Pawn Game",
      result: GameResult.DRAW,
      mainWeaknessTag: WeaknessTag.CALCULATION_DEPTH,
      secondaryWeaknessTags: [WeaknessTag.POOR_DEVELOPMENT],
      recommendedLessonTitle: 'Use space gains to create forcing play',
      recommendedLessonWhy:
        'Eva built a good position but missed the moment to open lines.',
      recommendedFocusPoints: [
        'Find one forcing break in every space advantage',
      ],
      rawExtractedContext: jsonObject({
        annotationCoverage: AnnotationCoverage.FULL,
        reducedConfidenceWarning: null,
      }),
      rawAnalysisJson: jsonObject({
        source: 'seed',
        scenario: 'eva-progress-gap',
      }),
    }),
    buildAnalysisRow({
      id: analysisIds.eva2,
      coachAccountId,
      studentId: studentIds.eva,
      gameId: gameIds.eva2,
      analysisJobId: jobIds.evaAnalysis2,
      createdAt: '2026-08-08T17:10:00.000Z',
      confidenceLevel: ConfidenceLevel.MEDIUM,
      overallDiagnosis:
        'The conversion was successful, but the middlegame still included an avoidable tactical stumble.',
      openingName: 'Caro-Kann Defense',
      result: GameResult.WIN,
      mainWeaknessTag: WeaknessTag.MISSED_OPPONENT_THREAT,
      secondaryWeaknessTags: [WeaknessTag.TIME_MANAGEMENT],
      recommendedLessonTitle: 'Pause before tactical commitments',
      recommendedLessonWhy:
        'The position stayed good, but one rushed move invited unnecessary counterplay.',
      recommendedFocusPoints: ['Add a blunder-check before every forcing move'],
      rawExtractedContext: jsonObject({
        annotationCoverage: AnnotationCoverage.FULL,
        reducedConfidenceWarning: null,
      }),
      rawAnalysisJson: jsonObject({
        source: 'seed',
        scenario: 'eva-progress-gap',
      }),
    }),
    buildAnalysisRow({
      id: analysisIds.fedor1,
      coachAccountId,
      studentId: studentIds.fedor,
      gameId: gameIds.fedor1,
      analysisJobId: jobIds.fedorAnalysis1,
      createdAt: '2026-05-28T09:11:00.000Z',
      confidenceLevel: ConfidenceLevel.HIGH,
      overallDiagnosis:
        'Opening preparation paid off, and the middlegame attack converted cleanly.',
      openingName: 'Ruy Lopez',
      result: GameResult.WIN,
      mainWeaknessTag: WeaknessTag.POOR_CONVERSION,
      secondaryWeaknessTags: [WeaknessTag.TIME_MANAGEMENT],
      recommendedLessonTitle: 'Convert small advantages without drifting',
      recommendedLessonWhy:
        'Even in a win, several clean technical continuations were available.',
      recommendedFocusPoints: [
        'Simplify only after identifying the safest endgame',
      ],
      rawExtractedContext: jsonObject({
        annotationCoverage: AnnotationCoverage.FULL,
        reducedConfidenceWarning: null,
      }),
      rawAnalysisJson: jsonObject({
        source: 'seed',
        scenario: 'fedor-archived',
      }),
    }),
    buildAnalysisRow({
      id: analysisIds.fedor2,
      coachAccountId,
      studentId: studentIds.fedor,
      gameId: gameIds.fedor2,
      analysisJobId: jobIds.fedorAnalysis2,
      createdAt: '2026-06-14T13:43:00.000Z',
      confidenceLevel: ConfidenceLevel.MEDIUM,
      overallDiagnosis:
        'Strategic choices were fine, but the partial annotations leave the technical ending less certain.',
      openingName: 'Nimzo-Indian Defense',
      result: GameResult.DRAW,
      mainWeaknessTag: WeaknessTag.ENDGAME_TECHNIQUE,
      secondaryWeaknessTags: [
        WeaknessTag.REDUCED_CONFIDENCE,
        WeaknessTag.BAD_TRADE,
      ],
      recommendedLessonTitle: 'Convert equal endings with a clear plan',
      recommendedLessonWhy:
        'The game stayed balanced, but endgame plans were not concrete enough.',
      recommendedFocusPoints: [
        'Name the target square before exchanging pieces',
      ],
      rawExtractedContext: jsonObject({
        annotationCoverage: AnnotationCoverage.PARTIAL,
        reducedConfidenceWarning:
          'Endgame annotations stop abruptly after move 32.',
      }),
      rawAnalysisJson: jsonObject({
        source: 'seed',
        scenario: 'fedor-archived',
      }),
    }),
    buildAnalysisRow({
      id: analysisIds.fedor3,
      coachAccountId,
      studentId: studentIds.fedor,
      gameId: gameIds.fedor3,
      analysisJobId: jobIds.fedorAnalysis3,
      createdAt: '2026-07-09T15:12:00.000Z',
      confidenceLevel: ConfidenceLevel.HIGH,
      overallDiagnosis:
        'The Catalan structure was promising, but a late tactical oversight spoiled the game.',
      openingName: 'Catalan Opening',
      result: GameResult.LOSS,
      mainWeaknessTag: WeaknessTag.MISSED_OPPONENT_THREAT,
      secondaryWeaknessTags: [WeaknessTag.CALCULATION_DEPTH],
      recommendedLessonTitle: 'Keep threat checks in technical positions',
      recommendedLessonWhy:
        'The strategic position was fine until a direct tactical idea was ignored.',
      recommendedFocusPoints: [
        'Scan for forcing resources before every pawn grab',
      ],
      rawExtractedContext: jsonObject({
        annotationCoverage: AnnotationCoverage.FULL,
        reducedConfidenceWarning: null,
      }),
      rawAnalysisJson: jsonObject({
        source: 'seed',
        scenario: 'fedor-archived',
      }),
    }),
  ];

  const criticalMoments = [
    buildCriticalMomentRow({
      id: 'seed-moment-anna-1',
      analysisId: analysisIds.anna1,
      createdAt: '2026-06-18T09:12:10.000Z',
      ply: 18,
      fullMoveNumber: 9,
      moveNumber: '9.',
      moveColor: MoveColor.WHITE,
      san: 'd4',
      bestMove: 'O-O',
      beforeFen:
        'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQK2R w KQkq - 0 6',
      afterFen:
        'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2BP4/2P2N2/PP3PPP/RNBQK2R b KQkq - 0 6',
      severity: MomentSeverity.BLUNDER,
      summary: 'Opened the center before finishing king safety.',
    }),
    buildCriticalMomentRow({
      id: 'seed-moment-anna-2',
      analysisId: analysisIds.anna2,
      createdAt: '2026-07-02T12:13:10.000Z',
      ply: 24,
      fullMoveNumber: 12,
      moveNumber: '12...',
      moveColor: MoveColor.BLACK,
      san: 'c4',
      bestMove: 'Ne7',
      beforeFen:
        'r1bq1rk1/pp1n1ppp/2p1pn2/3pP3/2PP4/P1N2N2/1P3PPP/R1BQ1RK1 b - - 0 12',
      afterFen:
        'r1bq1rk1/pp1n1ppp/4pn2/3pP3/2Pp4/P1N2N2/1P3PPP/R1BQ1RK1 w - - 0 13',
      severity: MomentSeverity.MISTAKE,
      summary:
        'Rushed the central break without checking the endgame consequences.',
    }),
    buildCriticalMomentRow({
      id: 'seed-moment-anna-3',
      analysisId: analysisIds.anna3,
      createdAt: '2026-07-18T15:11:10.000Z',
      ply: 20,
      fullMoveNumber: 10,
      moveNumber: '10.',
      moveColor: MoveColor.WHITE,
      san: 'Qh5',
      bestMove: 'Nf3',
      beforeFen:
        'r2qkbnr/pp2pppp/2p5/3p4/3P4/2N3P1/PPP1PPBP/R1BQK1NR w KQkq - 0 10',
      afterFen:
        'r2qkbnr/pp2pppp/2p5/3p3Q/3P4/2N3P1/PPP1PPBP/R1B1K1NR b KQkq - 1 10',
      severity: MomentSeverity.MISTAKE,
      summary: 'Found an active idea but did not fully calculate the reply.',
    }),
    buildCriticalMomentRow({
      id: 'seed-moment-anna-4',
      analysisId: analysisIds.anna4,
      createdAt: '2026-07-30T10:13:10.000Z',
      ply: 34,
      fullMoveNumber: 17,
      moveNumber: '17...',
      moveColor: MoveColor.BLACK,
      san: 'Rc8',
      bestMove: 'h6',
      beforeFen:
        '2rq1rk1/pb1n1ppp/1p2pn2/3p4/2PP4/1PN1PN2/PB3PPP/2RQ1RK1 b - - 0 17',
      afterFen:
        '2r2rk1/pb1n1ppp/1p2pn2/3p4/2PP4/1PN1PN2/PB3PPP/2RQR1K1 w - - 1 18',
      severity: MomentSeverity.BLUNDER,
      summary: 'Ignored the direct kingside threat while seeking counterplay.',
    }),
    buildCriticalMomentRow({
      id: 'seed-moment-anna-5',
      analysisId: analysisIds.anna5,
      createdAt: '2026-08-10T14:14:10.000Z',
      ply: 26,
      fullMoveNumber: 13,
      moveNumber: '13.',
      moveColor: MoveColor.WHITE,
      san: 'f5',
      bestMove: 'd4',
      beforeFen:
        'r1bqk2r/pp2ppbp/2n3p1/2pp4/3P1P2/2N2N2/PPP1P1PP/R1BQKB1R w KQkq - 0 13',
      afterFen:
        'r1bqk2r/pp2ppbp/2n3p1/2pp1P2/3P4/2N2N2/PPP1P1PP/R1BQKB1R b KQkq - 0 13',
      severity: MomentSeverity.INACCURACY,
      summary:
        'The plan was good, but there was an even cleaner conversion path.',
    }),
    buildCriticalMomentRow({
      id: 'seed-moment-dmitry-1',
      analysisId: analysisIds.dmitry1,
      createdAt: '2026-08-03T10:10:10.000Z',
      ply: 22,
      fullMoveNumber: 11,
      moveNumber: '11.',
      moveColor: MoveColor.WHITE,
      san: 'Bxf7+',
      bestMove: 'Nd5',
      beforeFen:
        'r1bqkb1r/pppp1ppp/2n5/4p3/3Pn3/2N2N2/PPP2PPP/R1BQKB1R w KQkq - 0 11',
      afterFen:
        'r1bqkb1r/pppp1Bpp/2n5/4p3/3Pn3/2N2N2/PPP2PPP/R1BQK2R b KQkq - 0 11',
      severity: MomentSeverity.MISTAKE,
      summary: 'The sacrifice worked, but a cleaner tactical route existed.',
    }),
    buildCriticalMomentRow({
      id: 'seed-moment-eva-1',
      analysisId: analysisIds.eva1,
      createdAt: '2026-07-25T10:11:10.000Z',
      ply: 28,
      fullMoveNumber: 14,
      moveNumber: '14.',
      moveColor: MoveColor.WHITE,
      san: 'c5',
      bestMove: 'Re1',
      beforeFen:
        'r2q1rk1/pp2bppp/2n1pn2/3p4/2PP4/2N1PN2/PPQ2PPP/R1B2RK1 w - - 0 14',
      afterFen:
        'r2q1rk1/pp2bppp/2n1pn2/2Pp4/3P4/2N1PN2/PPQ2PPP/R1B2RK1 b - - 0 14',
      severity: MomentSeverity.MISTAKE,
      summary: 'Grabbed space but missed the more forcing follow-up.',
    }),
    buildCriticalMomentRow({
      id: 'seed-moment-eva-2',
      analysisId: analysisIds.eva2,
      createdAt: '2026-08-08T17:10:10.000Z',
      ply: 24,
      fullMoveNumber: 12,
      moveNumber: '12...',
      moveColor: MoveColor.BLACK,
      san: 'Qa5',
      bestMove: 'e6',
      beforeFen:
        'r1b1kbnr/ppp2ppp/2n5/q2pp3/3P4/2N2N2/PPP1PPPP/R1BQKB1R b KQkq - 0 12',
      afterFen:
        'r1b1kbnr/ppp2ppp/2n5/q2pp3/3P4/2N2N2/PPP1PPPP/R1BQKB1R w KQkq - 1 13',
      severity: MomentSeverity.MISTAKE,
      summary:
        'Counterplay existed, but the move order allowed unnecessary tactics.',
    }),
    buildCriticalMomentRow({
      id: 'seed-moment-fedor-1',
      analysisId: analysisIds.fedor1,
      createdAt: '2026-05-28T09:11:10.000Z',
      ply: 30,
      fullMoveNumber: 15,
      moveNumber: '15.',
      moveColor: MoveColor.WHITE,
      san: 'Bxh7+',
      bestMove: 'd4',
      beforeFen:
        'r2q1rk1/ppp1bppp/2n1pn2/3p4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w - - 0 15',
      afterFen:
        'r2q1rk1/ppp1bpBp/2n1pn2/3p4/2PP4/2N1PN2/PP3PPP/R1BQ1RK1 b - - 0 15',
      severity: MomentSeverity.INACCURACY,
      summary: 'The attack worked, but a calmer central squeeze was simpler.',
    }),
    buildCriticalMomentRow({
      id: 'seed-moment-fedor-2',
      analysisId: analysisIds.fedor2,
      createdAt: '2026-06-14T13:43:10.000Z',
      ply: 40,
      fullMoveNumber: 20,
      moveNumber: '20...',
      moveColor: MoveColor.BLACK,
      san: 'Qe7',
      bestMove: 'c5',
      beforeFen:
        '2rq1rk1/pp3ppp/2n1pn2/2pp4/3P4/2N1PN2/PPQ2PPP/2RR2K1 b - - 0 20',
      afterFen:
        '2r2rk1/pp2qppp/2n1pn2/2pp4/3P4/2N1PN2/PPQ2PPP/2RR2K1 w - - 1 21',
      severity: MomentSeverity.MISTAKE,
      summary: 'The endgame plan stayed vague once the queens shifted.',
    }),
    buildCriticalMomentRow({
      id: 'seed-moment-fedor-3',
      analysisId: analysisIds.fedor3,
      createdAt: '2026-07-09T15:12:10.000Z',
      ply: 36,
      fullMoveNumber: 18,
      moveNumber: '18.',
      moveColor: MoveColor.WHITE,
      san: 'Qxb7',
      bestMove: 'Rc1',
      beforeFen:
        'r2q1rk1/p1p1bppp/2n1pn2/3p4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w - - 0 18',
      afterFen:
        'r2q1rk1/pQp1bppp/2n1pn2/3p4/2PP4/2N1PN2/PP2BPPP/R1B2RK1 b - - 0 18',
      severity: MomentSeverity.BLUNDER,
      summary: 'A pawn grab ignored the immediate tactical refutation.',
    }),
  ];

  const mistakes = [
    buildMistakeRow({
      id: 'seed-mistake-anna-1a',
      analysisId: analysisIds.anna1,
      criticalMomentId: 'seed-moment-anna-1',
      createdAt: '2026-06-18T09:12:20.000Z',
      severity: MomentSeverity.BLUNDER,
      category: 'king_safety',
      mainTag: WeaknessTag.KING_SAFETY,
      secondaryTags: [
        WeaknessTag.DELAYED_CASTLING,
        WeaknessTag.MISSED_OPPONENT_THREAT,
      ],
      explanation:
        'Opened the center before castling and allowed a direct attack.',
      suggestedFix:
        'Castle first or verify every forcing reply after a pawn break.',
    }),
    buildMistakeRow({
      id: 'seed-mistake-anna-1b',
      analysisId: analysisIds.anna1,
      criticalMomentId: 'seed-moment-anna-1',
      createdAt: '2026-06-18T09:12:21.000Z',
      severity: MomentSeverity.BLUNDER,
      category: 'missed_opponent_threat',
      explanation: 'Ignored the opponent check sequence entirely.',
      suggestedFix:
        'Name the most forcing reply for the opponent before moving.',
    }),
    buildMistakeRow({
      id: 'seed-mistake-anna-1c',
      analysisId: analysisIds.anna1,
      criticalMomentId: null,
      createdAt: '2026-06-18T09:12:22.000Z',
      severity: MomentSeverity.MATE,
      category: 'tactical_awareness',
      explanation: 'Missed a mating net developing on the dark squares.',
      suggestedFix: 'Scan king escape squares before committing to an attack.',
    }),
    buildMistakeRow({
      id: 'seed-mistake-anna-1d',
      analysisId: analysisIds.anna1,
      criticalMomentId: null,
      createdAt: '2026-06-18T09:12:23.000Z',
      severity: MomentSeverity.MATE,
      category: 'calculation',
      explanation: 'Stopped calculation one move before the forcing finish.',
      suggestedFix: 'Calculate until the position becomes quiet.',
    }),
    buildMistakeRow({
      id: 'seed-mistake-anna-2a',
      analysisId: analysisIds.anna2,
      criticalMomentId: 'seed-moment-anna-2',
      createdAt: '2026-07-02T12:13:20.000Z',
      severity: MomentSeverity.BLUNDER,
      category: 'time_management',
      mainTag: WeaknessTag.TIME_MANAGEMENT,
      secondaryTags: [WeaknessTag.PAWN_STRUCTURE, WeaknessTag.TUNNEL_VISION],
      explanation: 'Clock pressure led to a rushed central break.',
      suggestedFix:
        'Spend one extra check cycle before structural commitments.',
    }),
    buildMistakeRow({
      id: 'seed-mistake-anna-2b',
      analysisId: analysisIds.anna2,
      criticalMomentId: null,
      createdAt: '2026-07-02T12:13:21.000Z',
      severity: MomentSeverity.BLUNDER,
      category: 'pawn_structure',
      explanation: 'Accepted an isolated pawn without compensation.',
      suggestedFix: 'Compare resulting endgames before exchanging.',
    }),
    buildMistakeRow({
      id: 'seed-mistake-anna-2c',
      analysisId: analysisIds.anna2,
      criticalMomentId: null,
      createdAt: '2026-07-02T12:13:22.000Z',
      severity: MomentSeverity.MATE,
      category: 'reduced_confidence',
      explanation:
        'One annotated line still showed a mating idea being missed.',
      suggestedFix: 'Review the surviving forcing line from the PGN carefully.',
    }),
    buildMistakeRow({
      id: 'seed-mistake-anna-3a',
      analysisId: analysisIds.anna3,
      criticalMomentId: 'seed-moment-anna-3',
      createdAt: '2026-07-18T15:11:20.000Z',
      severity: MomentSeverity.BLUNDER,
      category: 'calculation',
      mainTag: WeaknessTag.CALCULATION_DEPTH,
      secondaryTags: [WeaknessTag.MISSED_FORK, WeaknessTag.OPENING_STRATEGY],
      explanation:
        'The first idea was correct, but the follow-up was undercalculated.',
      suggestedFix: 'Look one reply deeper in forcing positions.',
    }),
    buildMistakeRow({
      id: 'seed-mistake-anna-3b',
      analysisId: analysisIds.anna3,
      criticalMomentId: null,
      createdAt: '2026-07-18T15:11:21.000Z',
      severity: MomentSeverity.MATE,
      category: 'missed_fork',
      explanation: 'A tactical fork was available but not finished cleanly.',
      suggestedFix: 'State the tactical motif before moving.',
    }),
    buildMistakeRow({
      id: 'seed-mistake-anna-3c',
      analysisId: analysisIds.anna3,
      criticalMomentId: null,
      createdAt: '2026-07-18T15:11:22.000Z',
      severity: MomentSeverity.MISTAKE,
      category: 'opening_strategy',
      explanation:
        'The transition from opening to middlegame could have been smoother.',
      suggestedFix: 'Connect piece placement to the coming pawn break.',
    }),
    buildMistakeRow({
      id: 'seed-mistake-anna-4a',
      analysisId: analysisIds.anna4,
      criticalMomentId: 'seed-moment-anna-4',
      createdAt: '2026-07-30T10:13:20.000Z',
      severity: MomentSeverity.BLUNDER,
      category: 'threat_recognition',
      explanation: 'Counterplay was chosen over the direct defensive move.',
      suggestedFix: 'Answer the strongest threat before seeking activity.',
    }),
    buildMistakeRow({
      id: 'seed-mistake-anna-4b',
      analysisId: analysisIds.anna4,
      criticalMomentId: null,
      createdAt: '2026-07-30T10:13:21.000Z',
      severity: MomentSeverity.MISTAKE,
      category: 'time_management',
      explanation: 'Spent too little time on the final defensive decision.',
      suggestedFix: 'Bank time for the last major middlegame decision.',
    }),
    buildMistakeRow({
      id: 'seed-mistake-anna-5a',
      analysisId: analysisIds.anna5,
      criticalMomentId: 'seed-moment-anna-5',
      createdAt: '2026-08-10T14:14:20.000Z',
      severity: MomentSeverity.MISTAKE,
      category: 'conversion',
      explanation: 'The initiative could have been converted more directly.',
      suggestedFix:
        'Translate activity into one concrete target before simplifying.',
    }),
    buildMistakeRow({
      id: 'seed-mistake-anna-5b',
      analysisId: analysisIds.anna5,
      criticalMomentId: null,
      createdAt: '2026-08-10T14:14:21.000Z',
      severity: MomentSeverity.INACCURACY,
      category: 'time_management',
      explanation: 'The good position was still rushed slightly in conversion.',
      suggestedFix: 'Use the safer move when already better.',
    }),
    buildMistakeRow({
      id: 'seed-mistake-dmitry-1a',
      analysisId: analysisIds.dmitry1,
      criticalMomentId: 'seed-moment-dmitry-1',
      createdAt: '2026-08-03T10:10:20.000Z',
      severity: MomentSeverity.MISTAKE,
      category: 'calculation',
      explanation: 'The attack landed, but the cleanest line was missed.',
      suggestedFix: 'Finish checking forcing captures before sacrificing.',
    }),
    buildMistakeRow({
      id: 'seed-mistake-eva-1a',
      analysisId: analysisIds.eva1,
      criticalMomentId: 'seed-moment-eva-1',
      createdAt: '2026-07-25T10:11:20.000Z',
      severity: MomentSeverity.MISTAKE,
      category: 'calculation',
      explanation:
        'Space gain was chosen without identifying the forcing follow-up.',
      suggestedFix: 'Pair every space move with one concrete tactical idea.',
    }),
    buildMistakeRow({
      id: 'seed-mistake-eva-2a',
      analysisId: analysisIds.eva2,
      criticalMomentId: 'seed-moment-eva-2',
      createdAt: '2026-08-08T17:10:20.000Z',
      severity: MomentSeverity.BLUNDER,
      category: 'missed_opponent_threat',
      mainTag: WeaknessTag.MISSED_OPPONENT_THREAT,
      secondaryTags: [WeaknessTag.EARLY_QUEEN, WeaknessTag.TUNNEL_VISION],
      explanation: 'The move order allowed unnecessary tactical counterplay.',
      suggestedFix:
        'Check the opponent forcing resource before every queen move.',
    }),
    buildMistakeRow({
      id: 'seed-mistake-fedor-1a',
      analysisId: analysisIds.fedor1,
      criticalMomentId: 'seed-moment-fedor-1',
      createdAt: '2026-05-28T09:11:20.000Z',
      severity: MomentSeverity.INACCURACY,
      category: 'conversion',
      explanation:
        'The attack succeeded, but a simpler technical route existed.',
      suggestedFix: 'Prefer the line with the clearest endgame transition.',
    }),
    buildMistakeRow({
      id: 'seed-mistake-fedor-2a',
      analysisId: analysisIds.fedor2,
      criticalMomentId: 'seed-moment-fedor-2',
      createdAt: '2026-06-14T13:43:20.000Z',
      severity: MomentSeverity.MISTAKE,
      category: 'endgame_technique',
      explanation: 'The endgame plan stayed too vague after the queen trade.',
      suggestedFix: 'Name the ideal piece placement before simplifying.',
    }),
    buildMistakeRow({
      id: 'seed-mistake-fedor-3a',
      analysisId: analysisIds.fedor3,
      criticalMomentId: 'seed-moment-fedor-3',
      createdAt: '2026-07-09T15:12:20.000Z',
      severity: MomentSeverity.BLUNDER,
      category: 'missed_opponent_threat',
      explanation: 'Grabbed material and ignored the tactical punishment.',
      suggestedFix:
        'Look for the opponent forcing sequence before taking pawns.',
    }),
  ];

  const reports = [
    buildReportRow({
      id: 'seed-report-anna-coach',
      coachAccountId,
      studentId: studentIds.anna,
      gameId: gameIds.anna5,
      analysisId: analysisIds.anna5,
      title: 'Coach report: Sicilian conversion check',
      audience: ReportAudience.COACH,
      createdAt: '2026-08-10T14:21:30.000Z',
      summary:
        'Recent games show fewer severe tactical misses and more controlled conversion after the opening.',
      highlights: [
        'Threat recognition improved in the latest two games',
        'Severe tactical errors dropped across the last five analyses',
      ],
      lessonFocus: [
        'Convert initiative into concrete gain',
        'Keep the final blunder check before simplification',
      ],
      nextSteps: [
        'Review move 13 in the Sicilian sample',
        'Prepare one conversion drill for the next lesson',
      ],
      metadata: jsonObject({
        tone: 'coach',
        linkedPerformanceTrend: 'improving',
      }),
    }),
    buildReportRow({
      id: 'seed-report-anna-parent',
      coachAccountId,
      studentId: studentIds.anna,
      gameId: gameIds.anna4,
      analysisId: analysisIds.anna4,
      title: 'Parent report: steady tactical progress',
      audience: ReportAudience.PARENT,
      createdAt: '2026-08-01T08:12:00.000Z',
      summary:
        'Anna is spotting more ideas on her own, and the main goal is slowing down before critical defensive choices.',
      highlights: [
        'Opening confidence is improving',
        'Decision quality stays best when she pauses before tactical moments',
      ],
      lessonFocus: ['Threat recognition', 'Calm defense before counterplay'],
      nextSteps: [
        'Practice two short defensive calculation puzzles',
        'Keep a short post-game note about the biggest opponent threat',
      ],
      metadata: jsonObject({
        tone: 'parent',
      }),
    }),
    buildReportRow({
      id: 'seed-report-fedor-coach',
      coachAccountId,
      studentId: studentIds.fedor,
      gameId: gameIds.fedor3,
      analysisId: analysisIds.fedor3,
      title: 'Coach report: archived summer block wrap-up',
      audience: ReportAudience.COACH,
      createdAt: '2026-07-10T09:06:30.000Z',
      summary:
        'Fedor finished the block with strong opening work, but late tactical checks still need structure.',
      highlights: [
        'Prepared opening positions were consistently good',
        'Late middlegame threat checks were the recurring weakness',
      ],
      lessonFocus: ['Threat checks in technical positions'],
      nextSteps: [
        'Keep this report as a baseline before reactivating the student',
      ],
      metadata: jsonObject({
        archived: true,
      }),
    }),
  ];

  const homeworks = [
    buildHomeworkRow({
      id: 'seed-homework-anna-1',
      coachAccountId,
      studentId: studentIds.anna,
      analysisId: analysisIds.anna5,
      title: 'Homework: convert initiative cleanly',
      createdAt: '2026-08-10T14:25:30.000Z',
      overview:
        'Use the latest Sicilian game to rehearse how activity should become a concrete target.',
      exercises: [
        'Annotate two alternative plans after move 13',
        'Solve five tactical conversion puzzles',
      ],
      focusPoints: [
        'Checks, captures, threats',
        'Simplify only after identifying the best endgame',
      ],
      notes: [
        'Bring one line you considered but rejected',
        'Flag any move where the opponent had a forcing reply',
      ],
      metadata: jsonObject({
        sourceAnalysisId: analysisIds.anna5,
      }),
    }),
    buildHomeworkRow({
      id: 'seed-homework-anna-2',
      coachAccountId,
      studentId: studentIds.anna,
      analysisId: analysisIds.anna3,
      title: 'Homework: finish the tactical line',
      createdAt: '2026-07-19T09:12:00.000Z',
      overview:
        'Work through the Caro-Kann middlegame and extend every forcing sequence one move deeper.',
      exercises: [
        'Rewrite the critical line from memory',
        'Find the missed fork in three related positions',
      ],
      focusPoints: [
        'Do not stop at the first attractive move',
        'Name the tactic before choosing the move',
      ],
      notes: ['Discuss move-order discipline in the next lesson'],
      metadata: jsonObject({
        sourceAnalysisId: analysisIds.anna3,
      }),
    }),
    buildHomeworkRow({
      id: 'seed-homework-fedor-1',
      coachAccountId,
      studentId: studentIds.fedor,
      analysisId: analysisIds.fedor2,
      title: 'Homework: clarify endgame plan',
      createdAt: '2026-06-15T08:07:00.000Z',
      overview:
        'Review the Nimzo-Indian ending and practice naming the target square before exchanging.',
      exercises: [
        'Annotate the queen trade decision',
        'Solve three minor-piece endgame positions',
      ],
      focusPoints: ['Target-square planning', 'Exchange only with a plan'],
      notes: ['Keep for archive reference only'],
      metadata: jsonObject({
        archived: true,
      }),
    }),
  ];

  const progressSnapshots = [
    buildProgressSnapshotRow({
      id: 'seed-progress-anna-1',
      coachAccountId,
      studentId: studentIds.anna,
      analysisCount: 5,
      createdAt: '2026-08-10T14:29:30.000Z',
      summary:
        'Progress is clearly visible: severe tactical collapses are down, and recent positions stay calmer under pressure.',
      improvements: [
        'Later games contain fewer blunders and mating oversights',
        'Conversion choices are more patient than they were in June',
      ],
      recurringWeaknesses: [
        'Threat recognition still slips when the opponent creates multiple forcing ideas',
        'Winning positions can still be rushed slightly',
      ],
      nextFocusPoints: [
        'Threat checks before every pawn break',
        'Convert activity into one concrete target before simplifying',
      ],
      confidenceLevel: ConfidenceLevel.HIGH,
    }),
    buildProgressSnapshotRow({
      id: 'seed-progress-fedor-1',
      coachAccountId,
      studentId: studentIds.fedor,
      analysisCount: 3,
      createdAt: '2026-07-10T09:11:30.000Z',
      summary:
        'The archived block ended with stable opening play and one recurring issue: missing late tactical resources.',
      improvements: ['Prepared openings regularly led to playable middlegames'],
      recurringWeaknesses: ['Late tactical threat checks were inconsistent'],
      nextFocusPoints: ['Scan forcing replies before taking material'],
      confidenceLevel: ConfidenceLevel.MEDIUM,
    }),
  ];

  const generationTraces = [
    buildGenerationTraceRow({
      id: 'seed-trace-anna-report-coach',
      coachAccountId,
      analysisJobId: jobIds.annaReportCoach,
      analysisId: analysisIds.anna5,
      reportId: 'seed-report-anna-coach',
      createdAt: '2026-08-10T14:21:30.000Z',
      inputPayload: jsonObject({
        audience: ReportAudience.COACH,
        analysisId: analysisIds.anna5,
      }),
      outputPayload: jsonObject({
        title: 'Coach report: Sicilian conversion check',
        status: 'completed',
      }),
    }),
    buildGenerationTraceRow({
      id: 'seed-trace-anna-report-parent',
      coachAccountId,
      analysisJobId: jobIds.annaReportParent,
      analysisId: analysisIds.anna4,
      reportId: 'seed-report-anna-parent',
      createdAt: '2026-08-01T08:12:00.000Z',
      inputPayload: jsonObject({
        audience: ReportAudience.PARENT,
        analysisId: analysisIds.anna4,
      }),
      outputPayload: jsonObject({
        title: 'Parent report: steady tactical progress',
        status: 'completed',
      }),
    }),
    buildGenerationTraceRow({
      id: 'seed-trace-anna-homework-1',
      coachAccountId,
      analysisJobId: jobIds.annaHomework1,
      analysisId: analysisIds.anna5,
      homeworkId: 'seed-homework-anna-1',
      createdAt: '2026-08-10T14:25:30.000Z',
      inputPayload: jsonObject({
        analysisId: analysisIds.anna5,
      }),
      outputPayload: jsonObject({
        title: 'Homework: convert initiative cleanly',
        status: 'completed',
      }),
    }),
    buildGenerationTraceRow({
      id: 'seed-trace-anna-homework-2',
      coachAccountId,
      analysisJobId: jobIds.annaHomework2,
      analysisId: analysisIds.anna3,
      homeworkId: 'seed-homework-anna-2',
      createdAt: '2026-07-19T09:12:00.000Z',
      inputPayload: jsonObject({
        analysisId: analysisIds.anna3,
      }),
      outputPayload: jsonObject({
        title: 'Homework: finish the tactical line',
        status: 'completed',
      }),
    }),
    buildGenerationTraceRow({
      id: 'seed-trace-anna-progress',
      coachAccountId,
      analysisJobId: jobIds.annaProgress,
      progressSnapshotId: 'seed-progress-anna-1',
      createdAt: '2026-08-10T14:29:30.000Z',
      inputPayload: jsonObject({
        studentId: studentIds.anna,
        analysisCount: 5,
      }),
      outputPayload: jsonObject({
        status: 'completed',
        summary:
          'Progress is clearly visible: severe tactical collapses are down.',
      }),
    }),
    buildGenerationTraceRow({
      id: 'seed-trace-dmitry-report-failed',
      coachAccountId,
      analysisJobId: jobIds.dmitryReportFailed,
      analysisId: analysisIds.dmitry1,
      createdAt: '2026-08-09T13:21:00.000Z',
      inputPayload: jsonObject({
        audience: ReportAudience.COACH,
        analysisId: analysisIds.dmitry1,
      }),
      outputPayload: jsonObject({
        error: 'Rate limit',
      }),
      failureCode: 'LLM_RATE_LIMIT',
      failureMessage: 'Temporary model rate limit while generating the report.',
    }),
    buildGenerationTraceRow({
      id: 'seed-trace-fedor-report',
      coachAccountId,
      analysisJobId: jobIds.fedorReport,
      analysisId: analysisIds.fedor3,
      reportId: 'seed-report-fedor-coach',
      createdAt: '2026-07-10T09:06:30.000Z',
      inputPayload: jsonObject({
        audience: ReportAudience.COACH,
        analysisId: analysisIds.fedor3,
      }),
      outputPayload: jsonObject({
        title: 'Coach report: archived summer block wrap-up',
        status: 'completed',
      }),
    }),
    buildGenerationTraceRow({
      id: 'seed-trace-fedor-homework',
      coachAccountId,
      analysisJobId: jobIds.fedorHomework,
      analysisId: analysisIds.fedor2,
      homeworkId: 'seed-homework-fedor-1',
      createdAt: '2026-06-15T08:07:00.000Z',
      inputPayload: jsonObject({
        analysisId: analysisIds.fedor2,
      }),
      outputPayload: jsonObject({
        title: 'Homework: clarify endgame plan',
        status: 'completed',
      }),
    }),
    buildGenerationTraceRow({
      id: 'seed-trace-fedor-progress',
      coachAccountId,
      analysisJobId: jobIds.fedorProgress,
      progressSnapshotId: 'seed-progress-fedor-1',
      createdAt: '2026-07-10T09:11:30.000Z',
      inputPayload: jsonObject({
        studentId: studentIds.fedor,
        analysisCount: 3,
      }),
      outputPayload: jsonObject({
        status: 'completed',
        summary: 'The archived block ended with stable opening play.',
      }),
    }),
  ];

  return {
    students,
    externalAccounts,
    games,
    analysisJobs,
    analyses,
    criticalMoments,
    mistakes,
    reports,
    homeworks,
    progressSnapshots,
    generationTraces,
  };
}

async function resetAdminDataset(
  tx: Prisma.TransactionClient,
  coachAccountId: string,
) {
  const students = await tx.student.findMany({
    where: { coachAccountId },
    select: { id: true },
  });
  const studentIdsToDelete = students.map((student) => student.id);
  const analyses = await tx.gameAnalysis.findMany({
    where: { coachAccountId },
    select: { id: true },
  });
  const analysisIdsToDelete = analyses.map((analysis) => analysis.id);

  await tx.refreshToken.deleteMany({
    where: { coachAccountId },
  });
  await tx.generationTrace.deleteMany({
    where: { coachAccountId },
  });
  await tx.report.deleteMany({
    where: { coachAccountId },
  });
  await tx.homework.deleteMany({
    where: { coachAccountId },
  });
  await tx.progressSnapshot.deleteMany({
    where: { coachAccountId },
  });
  if (analysisIdsToDelete.length > 0) {
    await tx.mistake.deleteMany({
      where: {
        analysisId: { in: analysisIdsToDelete },
      },
    });
    await tx.criticalMoment.deleteMany({
      where: {
        analysisId: { in: analysisIdsToDelete },
      },
    });
  }
  await tx.gameAnalysis.deleteMany({
    where: { coachAccountId },
  });
  await tx.analysisJob.deleteMany({
    where: { coachAccountId },
  });
  await tx.game.deleteMany({
    where: { coachAccountId },
  });
  if (studentIdsToDelete.length > 0) {
    await tx.externalAccount.deleteMany({
      where: {
        studentId: { in: studentIdsToDelete },
      },
    });
  }
  await tx.student.deleteMany({
    where: { coachAccountId },
  });
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to run the Prisma seed.');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: databaseUrl,
    }),
  });

  try {
    const passwordHash = await hashPassword(ADMIN_PASSWORD);

    await prisma.$transaction(async (tx) => {
      const coach = await tx.coachAccount.upsert({
        where: {
          email: ADMIN_EMAIL,
        },
        update: {
          passwordHash,
          displayName: ADMIN_DISPLAY_NAME,
          status: CoachAccountStatus.ACTIVE,
        },
        create: {
          email: ADMIN_EMAIL,
          passwordHash,
          displayName: ADMIN_DISPLAY_NAME,
          status: CoachAccountStatus.ACTIVE,
        },
      });

      await resetAdminDataset(tx, coach.id);

      const dataset = buildDataset(coach.id);

      await tx.student.createMany({ data: dataset.students });
      await tx.externalAccount.createMany({ data: dataset.externalAccounts });
      await tx.game.createMany({ data: dataset.games });
      await tx.analysisJob.createMany({ data: dataset.analysisJobs });
      await tx.gameAnalysis.createMany({ data: dataset.analyses });
      await tx.criticalMoment.createMany({ data: dataset.criticalMoments });
      await tx.mistake.createMany({ data: dataset.mistakes });
      await tx.report.createMany({ data: dataset.reports });
      await tx.homework.createMany({ data: dataset.homeworks });
      await tx.progressSnapshot.createMany({
        data: dataset.progressSnapshots,
      });
      await tx.generationTrace.createMany({
        data: dataset.generationTraces,
      });
    });

    console.log(
      `Seeded ${ADMIN_EMAIL} with 6 students, 16 games, 11 analyses, 3 reports, 3 homework items, and 2 progress snapshots.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
