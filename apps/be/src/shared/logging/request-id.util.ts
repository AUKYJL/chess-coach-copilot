import { randomUUID } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';

export const REQUEST_ID_HEADER = 'x-request-id';

export function normalizeRequestId(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  return null;
}

export function readRequestIdHeader(
  headers: IncomingHttpHeaders | undefined,
): string | null {
  if (!headers) {
    return null;
  }

  const value = headers[REQUEST_ID_HEADER];

  if (Array.isArray(value)) {
    return normalizeRequestId(value[0]);
  }

  return normalizeRequestId(value);
}

export function resolveRequestId(
  request: Pick<
    { id?: unknown; headers: IncomingHttpHeaders },
    'id' | 'headers'
  >,
): string {
  return (
    normalizeRequestId(request.id) ??
    readRequestIdHeader(request.headers) ??
    randomUUID()
  );
}
