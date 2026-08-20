import type { EngineEvaluation } from '../preparation/engine-evidence.model.js';

export function normalizeUciScore(
  type: 'cp' | 'mate',
  value: number,
  sideToMove: 'w' | 'b',
): EngineEvaluation {
  const canonicalValue = sideToMove === 'w' ? value : -value;

  return { type, value: canonicalValue };
}

export function compareEngineEvaluations(
  left: EngineEvaluation,
  right: EngineEvaluation,
): number {
  if (left.type === 'cp' && right.type === 'cp') {
    return left.value - right.value;
  }

  if (left.type === 'mate' && right.type === 'mate') {
    return compareMateScores(left.value, right.value);
  }

  if (left.type === 'mate') {
    return left.value > 0 ? 1 : -1;
  }

  return right.value > 0 ? -1 : 1;
}

function compareMateScores(left: number, right: number): number {
  if (left > 0 && right < 0) {
    return 1;
  }
  if (left < 0 && right > 0) {
    return -1;
  }
  if (left !== 0) {
    return right - left;
  }
  return 0;
}
