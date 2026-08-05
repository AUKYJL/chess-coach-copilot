import { createHash } from 'crypto';

export function normalizePgn(rawPgn: string): string {
  return rawPgn
    .replace(/\r\n/g, '\n')
    .replace(/}\s*{/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function createPgnFingerprint(rawPgn: string): string {
  return createHash('sha256').update(normalizePgn(rawPgn)).digest('hex');
}
