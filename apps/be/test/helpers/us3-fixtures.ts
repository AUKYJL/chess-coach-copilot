import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  AnalysisJobStatus,
  AnalysisJobType,
  AnnotationCoverage,
  ConfidenceLevel,
  GameResult,
  GameSourceType,
  MomentSeverity,
  MoveColor,
  StudentColor,
  WeaknessTag,
} from '../../src/generated/prisma/client.js';
import { InMemoryPrismaService } from './in-memory-prisma.js';

type TestServer = Parameters<typeof request>[0];

export async function createCompletedAnalysisFixture(args: {
  app: INestApplication;
  prisma: InMemoryPrismaService;
  analysisCount?: number;
  archivedStudent?: boolean;
  overallDiagnosisPrefix?: string;
}) {
  const analysisCount = args.analysisCount ?? 1;
  const overallDiagnosisPrefix =
    args.overallDiagnosisPrefix ?? 'Saved analysis';
  const email = `coach-${Math.random()}@example.com`;
  const accessToken = await registerCoach(args.app, email);
  const coach = (await args.prisma.coachAccount.findUnique({
    where: { email },
  })) as { id: string; email: string } | null;

  if (!coach) {
    throw new Error('Coach fixture was not created');
  }

  const studentResponse = await request(getServer(args.app))
    .post('/students')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      displayName: 'Student',
    })
    .expect(201);
  const studentId = studentResponse.body.id as string;
  const analyses: Array<{ id: string; analysisJobId: string; gameId: string }> =
    [];

  for (let index = 0; index < analysisCount; index += 1) {
    const game = await args.prisma.game.create({
      data: {
        coachAccountId: coach.id,
        studentId,
        sourceType: GameSourceType.MANUAL_PGN,
        sourceLabel: `Imported PGN ${index + 1}`,
        studentColor: StudentColor.WHITE,
        rawPgn: `[Event "Training ${index + 1}"]\n[Result "1-0"]\n\n1. e4 { [%eval 0.2] } e5 { [%eval 0.1] } 2. Nf3 { [%eval 0.5] } Nc6 1-0`,
        normalizedPgnHash: `fixture-hash-${index + 1}-${Math.random()}`,
        hasEngineAnnotations: true,
        annotationCoverage: AnnotationCoverage.FULL,
        reducedConfidenceWarning: null,
      },
    });
    const analysisJob = await args.prisma.analysisJob.create({
      data: {
        coachAccountId: coach.id,
        studentId,
        gameId: game.id,
        jobType: AnalysisJobType.ANALYSIS,
        queueName: 'analysis',
      },
    });
    const analysis = await args.prisma.gameAnalysis.create({
      data: {
        coachAccountId: coach.id,
        studentId,
        gameId: game.id,
        analysisJobId: analysisJob.id,
        confidenceLevel: ConfidenceLevel.HIGH,
        overallDiagnosis: `${overallDiagnosisPrefix} ${index + 1}`,
        openingName: 'Italian Game',
        result: GameResult.WIN,
        mainWeaknessTag: WeaknessTag.CALCULATION_DEPTH,
        secondaryWeaknessTags: [WeaknessTag.TIME_MANAGEMENT],
        recommendedLessonTitle: 'Candidate move discipline',
        recommendedLessonWhy: 'Missed forcing continuation',
        recommendedFocusPoints: ['Check forcing moves first'],
        rawExtractedContext: {
          annotationCoverage: AnnotationCoverage.FULL,
          reducedConfidenceWarning: null,
        },
        rawAnalysisJson: {
          source: 'fixture',
          index,
        },
      },
    });

    await args.prisma.criticalMoment.createMany({
      data: [
        {
          analysisId: analysis.id,
          ply: 5 + index,
          fullMoveNumber: 3,
          moveNumber: '3.',
          moveColor: MoveColor.WHITE,
          san: 'Bb5',
          lan: null,
          uci: null,
          beforeFen: `before-fen-${index}`,
          afterFen: `after-fen-${index}`,
          bestMove: 'Bc4',
          bestVariation: ['Bc4', 'Nf6'],
          nags: ['$2'],
          comments: ['Missed a stronger continuation'],
          evaluationBefore: { kind: 'centipawns', value: 20 },
          evaluationAfter: { kind: 'centipawns', value: -80 },
          severity: MomentSeverity.MISTAKE,
          sourceEvidence: { source: 'fixture' },
        },
      ],
    });
    const [criticalMoment] = await args.prisma.criticalMoment.findMany({
      where: { analysisId: analysis.id },
    });
    await args.prisma.mistake.createMany({
      data: [
        {
          analysisId: analysis.id,
          criticalMomentId: criticalMoment.id,
          severity: MomentSeverity.MISTAKE,
          category: 'calculation',
          explanation: 'Missed the forcing continuation.',
          suggestedFix: 'Check forcing moves first.',
          sourceEvidence: { source: 'fixture' },
        },
      ],
    });
    await args.prisma.analysisJob.update({
      where: { id: analysisJob.id },
      data: {
        status: AnalysisJobStatus.COMPLETED,
        progressPercent: 100,
        completedAt: new Date(),
      },
    });

    analyses.push({
      id: analysis.id,
      analysisJobId: analysisJob.id,
      gameId: game.id,
    });
  }

  if (args.archivedStudent) {
    await request(getServer(args.app))
      .post(`/students/${studentId}/archive`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ archived: true })
      .expect(200);
  }

  return {
    accessToken,
    coachAccountId: coach.id,
    studentId,
    analyses,
  };
}

export async function registerCoach(app: INestApplication, email: string) {
  const server = getServer(app);
  const authResponse = await request(server).post('/auth/register').send({
    email,
    password: 'strongpass1',
    displayName: 'Coach',
  });

  return authResponse.body.accessToken as string;
}

export function getServer(app: INestApplication): TestServer {
  return app.getHttpServer() as TestServer;
}
