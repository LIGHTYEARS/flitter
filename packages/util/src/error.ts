/**
 * Error types and timeout utilities
 *
 * Provides TimeoutError class and callWithTimeout wrapper function
 *
 * @example
 * ```ts
 * import { callWithTimeout, TimeoutError } from '@flitter/util';
 * try {
 *   const result = await callWithTimeout(fetch(url), 5000);
 * } catch (e) {
 *   if (e instanceof TimeoutError) console.log(`Timed out after ${e.timeout}ms`);
 * }
 * ```
 */

export class TimeoutError extends Error {
  readonly timeout: number;
  constructor(message: string, timeout: number) {
    super(message);
    this.name = "TimeoutError";
    this.timeout = timeout;
    // Fix prototype chain for instanceof
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

export async function callWithTimeout<T>(
  promise: Promise<T>,
  timeout: number,
  message?: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new TimeoutError(message ?? `Operation timed out after ${timeout}ms`, timeout));
    }, timeout);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };
