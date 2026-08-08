import { ConflictException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { ExternalPlatform } from '../../src/generated/prisma/client.js';
import { ExternalAccountsService } from '../../src/external-accounts/external-accounts.service.js';

describe('ExternalAccountsService', () => {
  it('maps create unique races to conflict', async () => {
    const service = new ExternalAccountsService({
      student: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'student-1',
          archivedAt: null,
        }),
      },
      externalAccount: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockRejectedValue({ code: 'P2002' }),
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
    const service = new ExternalAccountsService({
      student: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'student-1',
          archivedAt: null,
        }),
      },
      externalAccount: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: 'account-1', studentId: 'student-1' })
          .mockResolvedValueOnce(null),
        update: jest.fn().mockRejectedValue({ code: 'P2002' }),
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
