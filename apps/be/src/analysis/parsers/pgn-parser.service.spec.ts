import { PgnParserService } from './pgn-parser.service.js';

describe('PgnParserService', () => {
  const service = new PgnParserService();

  it('parses a valid PGN with moves and comments', () => {
    const parsed = service.parse(`[Event "Test"]
[Result "1-0"]

1. e4 { [%eval 0.2] } e5 { [%eval 0.1] } 2. Nf3 Nc6 1-0`);

    expect(parsed.moves).toHaveLength(4);
    expect(parsed.comments).toHaveLength(2);
    expect(parsed.headers.Event).toBe('Test');
  });

  it('parses PGN that only becomes valid after normalization', () => {
    const parsed = service.parse(`[Event "Test"]\r
[Result "1-0"]

1. e4 { [%eval 0.2] }{ Good } e5\t\t2. Nf3   Nc6 1-0`);

    expect(parsed.moves).toHaveLength(4);
    expect(parsed.comments).toHaveLength(1);
  });

  it('rejects invalid pgn input', () => {
    expect(() => service.parse('not a real pgn')).toThrow('Invalid PGN:');
  });
});
