import {
  AnalysisJobStatus,
  StudentColor,
} from '../../src/generated/prisma/client.js';
import { mapGameWithLatestJob } from '../../src/games/game-read-model.js';

describe('mapGameWithLatestJob', () => {
  it('maps latest job metadata without extra I/O', () => {
    const result = mapGameWithLatestJob({
      id: 'game-1',
      sourceLabel: 'Annotated export',
      studentColor: StudentColor.WHITE,
      event: 'Training',
      site: 'Lichess',
      whitePlayerName: 'Student',
      blackPlayerName: 'Opponent',
      openingHeader: 'Italian Game',
      ecoCode: 'C50',
      rawResult: '1-0',
      derivedResult: 'WIN',
      plyCount: 42,
      engineEvidenceStatus: null,
      engineEvidenceSource: null,
      importedAt: new Date('2026-08-08T10:00:00.000Z'),
      analysisJobs: [
        {
          id: 'job-latest',
          status: AnalysisJobStatus.COMPLETED,
          analysis: { id: 'analysis-1' },
        },
      ],
    });

    expect(result).toMatchObject({
      id: 'game-1',
      latestAnalysisJobId: 'job-latest',
      latestAnalysisJobStatus: AnalysisJobStatus.COMPLETED,
      latestAnalysisId: 'analysis-1',
    });
  });

  it('includes a separately resolved engine analysis job id', () => {
    const result = mapGameWithLatestJob(
      {
        id: 'game-1',
        sourceLabel: null,
        studentColor: StudentColor.WHITE,
        event: null,
        site: null,
        whitePlayerName: null,
        blackPlayerName: null,
        openingHeader: null,
        ecoCode: null,
        rawResult: null,
        derivedResult: 'UNKNOWN',
        plyCount: 42,
        engineEvidenceStatus: null,
        engineEvidenceSource: null,
        importedAt: new Date('2026-08-08T10:00:00.000Z'),
        analysisJobs: [],
      },
      'engine-job-latest',
    );

    expect(result.latestEngineAnalysisJobId).toBe('engine-job-latest');
  });
});
