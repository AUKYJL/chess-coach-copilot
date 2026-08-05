import {
  createPgnFingerprint,
  normalizePgnForFingerprint,
} from './pgn-normalization.util.js';

describe('pgn-normalization.util', () => {
  it('normalizes CRLF line endings to LF for fingerprinting', () => {
    expect(
      normalizePgnForFingerprint('[Event "Test"]\r\n\r\n1. e4 e5 1-0'),
    ).toBe('[Event "Test"]\n\n1. e4 e5 1-0');
  });

  it('keeps adjacent comments separated in fingerprint normalization', () => {
    expect(
      normalizePgnForFingerprint('1. e4 { [%eval 0.2] }{ Good } e5 1-0'),
    ).toBe('1. e4 { [%eval 0.2] }{ Good } e5 1-0');
  });

  it('collapses repeated spaces and tabs', () => {
    expect(normalizePgnForFingerprint('1.\t e4   e5\t\t2. Nf3   Nc6 1-0')).toBe(
      '1. e4 e5 2. Nf3 Nc6 1-0',
    );
  });

  it('reduces three or more blank lines to two', () => {
    expect(
      normalizePgnForFingerprint('[Event "Test"]\n\n\n\n1. e4 e5 1-0'),
    ).toBe('[Event "Test"]\n\n1. e4 e5 1-0');
  });

  it('produces the same fingerprint for whitespace-equivalent PGNs', () => {
    const first = `[Event "Test"]
[Result "1-0"]

1. e4 { [%eval 0.2] }{ Good } e5 1-0`;
    const second = `[Event "Test"]\r
[Result "1-0"]


1.   e4 { [%eval 0.2] }{ Good } e5 1-0`;

    expect(createPgnFingerprint(first)).toBe(createPgnFingerprint(second));
  });
});
