import { ExternalPlatform } from '../../generated/prisma/client.js';

const coach = {
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
} as const;
