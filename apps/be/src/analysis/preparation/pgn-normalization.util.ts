import { createHash } from 'crypto';

export function normalizePgnForFingerprint(rawPgn: string): string {
  return rawPgn
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function createPgnFingerprint(rawPgn: string): string {
  return createHash('sha256')
    .update(normalizePgnForFingerprint(rawPgn))
    .digest('hex');
}
