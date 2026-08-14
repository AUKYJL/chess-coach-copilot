import { ConflictException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { ExternalPlatform } from '../../src/generated/prisma/client.js';
import { ExternalAccountsService } from '../../src/external-accounts/external-accounts.service.js';

describe('ExternalAccountsService', () => {
  it('maps create unique races to conflict', async () => {
    const prismaUniqueConstraintError = Object.assign(
      new Error('Unique constraint failed'),
      { code: 'P2002' },
    );
    const findStudent = jest.fn(() =>
      Promise.resolve({
        id: 'student-1',
        archivedAt: null,
      }),
    );
    const findExternalAccount = jest.fn(() => Promise.resolve(null));
    const createExternalAccount = jest.fn(() =>
      Promise.reject(prismaUniqueConstraintError),
    );

    const service = new ExternalAccountsService({
      student: {
        findFirst: findStudent,
      },
      externalAccount: {
        findFirst: findExternalAccount,
        create: createExternalAccount,
      },
    } as never);

    await expect(
      service.create('student-1', 'coach-1', {
        platform: ExternalPlatform.LICHESS,
        username: 'student-a',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps update unique races to conflict', async () => {
    const prismaUniqueConstraintError = Object.assign(
      new Error('Unique constraint failed'),
      { code: 'P2002' },
    );
    let findExternalAccountCallCount = 0;
    const findStudent = jest.fn(() =>
      Promise.resolve({
        id: 'student-1',
        archivedAt: null,
      }),
    );
    const findExternalAccount = jest.fn(() => {
      findExternalAccountCallCount += 1;

      if (findExternalAccountCallCount === 1) {
        return Promise.resolve({
          id: 'account-1',
          studentId: 'student-1',
        });
      }

      return Promise.resolve(null);
    });
    const updateExternalAccount = jest.fn(() =>
      Promise.reject(prismaUniqueConstraintError),
    );

    const service = new ExternalAccountsService({
      student: {
        findFirst: findStudent,
      },
      externalAccount: {
        findFirst: findExternalAccount,
        update: updateExternalAccount,
      },
    } as never);

    await expect(
      service.update('student-1', 'account-1', 'coach-1', {
        platform: ExternalPlatform.CHESS_COM,
        username: 'student-a',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
