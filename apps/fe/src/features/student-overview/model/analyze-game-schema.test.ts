import { describe, expect, it } from "vitest";

import { analyzeGameSchema, isAnnotatedPgn } from "./analyze-game-schema";

const validEvalPgn = `[Event "Training Game"]
[Site "Lichess"]
[Result "1-0"]

1. e4 { [%eval 0.18] } e5 { [%eval 0.22] } 2. Nf3 Nc6 1-0`;

const validVariationPgn = `[Event "Training Game"]
[Site "Chess.com"]
[Result "1-0"]

1. e4 e5 2. d4 exd4 3. Bc4 Nf6 4. c3?! { (-0.23 -> -1.21) Inaccuracy. Nf3 was best. } (4. Nf3 Bb4+ 5. c3 dxc3) 1-0`;

const plainCommentPgn = `[Event "Training Game"]
[Site "Lichess"]
[Result "1-0"]

1. e4 { Interesting game. } e5 2. Nf3 Nc6 1-0`;

describe("analyzeGameSchema", () => {
  it("accepts eval-annotated PGN supported by the backend import flow", () => {
    expect(isAnnotatedPgn(validEvalPgn)).toBe(true);
    expect(
      analyzeGameSchema.safeParse({
        rawPgn: validEvalPgn,
        studentColor: "WHITE",
        sourceLabel: "Annotated export",
      }).success,
    ).toBe(true);
  });

  it("accepts mistake markers only when they include a best-line variation", () => {
    expect(isAnnotatedPgn(validVariationPgn)).toBe(true);
  });

  it("rejects prose comments without reliable annotated evidence", () => {
    const result = analyzeGameSchema.safeParse({
      rawPgn: plainCommentPgn,
      studentColor: "WHITE",
      sourceLabel: "Coach notes only",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(
      /only annotated pgn with engine evaluation or a mistake marker plus best-line variation/i,
    );
  });
});
