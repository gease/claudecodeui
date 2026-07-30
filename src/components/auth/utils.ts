import type { ApiErrorPayload } from './types';

export async function parseJsonSafely<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function resolveApiErrorMessage(payload: ApiErrorPayload | null, fallback: string): string {
  if (!payload) {
    return fallback;
  }

  // The global Express error middleware serializes AppError as
  // { error: { code, message, details } }, not a plain string. Some older
  // routes still send { error: 'plain string' } directly, so both are
  // handled here rather than ever passing payload.error into JSX as-is.
  if (typeof payload.error === 'string') {
    return payload.error;
  }

  if (payload.error?.message) {
    return payload.error.message;
  }

  return payload.message ?? fallback;
}
