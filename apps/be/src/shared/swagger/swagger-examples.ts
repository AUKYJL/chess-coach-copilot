import { ExternalPlatform } from '../../generated/prisma/client.js';
import {
  AnnotationCoverage,
  AnalysisJobStatus,
  StudentColor,
} from '../../generated/prisma/client.js';

const coach = {
  id: '3d7f7e9a-6e2e-4db7-9ee4-f66cc5967e42',
  email: 'coach.alex.petrov@example.com',
  displayName: 'Alex Petrov',
  password: 'StrongPass123',
} as const;

const student = {
  id: '7f4a8c2d-1b7e-4a7f-9d3b-2c6f4e8a9b10',
  displayName: 'Maksim Sokolov',
  birthYear: 2012,
  rating: 1460,
  notes: 'Focuses on tactics and rook endgames.',
  archived: true,
} as const;

const externalAccount = {
  platform: ExternalPlatform.LICHESS,
  username: 'maksim_sokolov_2012',
} as const;

const importPgn = {
  studentColor: StudentColor.WHITE,
  sourceLabel: 'Lichess Study export',
  rawPgn: `[Event "Training Game"]
[Site "Lichess"]
[Date "2026.07.25"]
[Round "?"]
[White "Student"]
[Black "Opponent"]
[Result "1-0"]

1. e4 { [%eval 0.3] Good central control. } e5 { [%eval 0.1] } 2. Nf3 { [%eval 0.5] } Nc6 { [%eval 0.2] } 3. Bb5 { [%eval 0.9] } a6 { [%eval 0.4] } 1-0`,
} as const;

const analysisJob = {
  id: 'd517a8f0-48b0-4c7d-b8dc-a29af59c3c1b',
  gameId: '7d0af7b3-cf17-4eb0-b8a6-67a6981d4cc1',
  status: AnalysisJobStatus.PENDING,
  attemptCount: 0,
  isDuplicate: false,
  annotationCoverage: AnnotationCoverage.FULL,
} as const;

const studentUpsertPayload = {
  displayName: student.displayName,
  birthYear: student.birthYear,
  rating: student.rating,
  notes: student.notes,
} as const;

export const swaggerEntityExamples = {
  coach,
  student,
  externalAccount,
  importPgn,
  analysisJob,
} as const;

export const swaggerParamExamples = {
  studentId: student.id,
} as const;

export const swaggerRequestExamples = {
  auth: {
    register: {
      email: coach.email,
      password: coach.password,
      displayName: coach.displayName,
    },
    login: {
      email: coach.email,
      password: coach.password,
    },
  },
  students: {
    create: studentUpsertPayload,
    update: studentUpsertPayload,
    setArchive: {
      archived: student.archived,
    },
  },
  externalAccounts: {
    create: {
      platform: externalAccount.platform,
      username: externalAccount.username,
    },
  },
  imports: {
    create: importPgn,
  },
} as const;

export const swaggerResponseExamples = {
  auth: {
    coach: {
      id: coach.id,
      email: coach.email,
      displayName: coach.displayName,
    },
    session: {
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example.access-token',
      coach: {
        id: coach.id,
        email: coach.email,
        displayName: coach.displayName,
      },
    },
    refresh: {
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example.access-token',
    },
  },
} as const;
