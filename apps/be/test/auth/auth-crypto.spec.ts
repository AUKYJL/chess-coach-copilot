import {
  hashPassword,
  hashRefreshToken,
  verifyPassword,
} from '../../src/auth/auth-crypto.js';

describe('auth-crypto', () => {
  it('hashes and verifies passwords with argon2id', async () => {
    const password = 'strongpass1';
    const passwordHash = await hashPassword(password);

    expect(passwordHash).not.toBe(password);
    await expect(verifyPassword(passwordHash, password)).resolves.toBe(true);
    await expect(verifyPassword(passwordHash, 'wrongpass1')).resolves.toBe(
      false,
    );
  });

  it('hashes refresh tokens with stable sha256 output', () => {
    const refreshToken = 'refresh-token-value';
    const hashedToken = hashRefreshToken(refreshToken);

    expect(hashedToken).not.toBe(refreshToken);
    expect(hashedToken).toHaveLength(64);
    expect(hashedToken).toBe(hashRefreshToken(refreshToken));
    expect(hashedToken).not.toBe(hashRefreshToken('other-refresh-token'));
  });
});
