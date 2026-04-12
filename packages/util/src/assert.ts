/**
 * Assertion utility functions
 *
 * Provides runtime assertions and TypeScript type narrowing
 *
 * @example
 * ```ts
 * import { assert, assertDefined, assertNever } from '@flitter/util';
 * assert(x > 0, 'x must be positive');
 * const val = assertDefined(maybeNull, 'value required');
 * ```
 */

export function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message ?? "Assertion failed");
  }
}

export function assertNever(value: never, message?: string): never {
  throw new Error(message ?? `Unexpected value: ${JSON.stringify(value)}`);
}

export function assertDefined<T>(value: T | undefined | null, message?: string): T {
  if (value === undefined || value === null) {
    throw new Error(message ?? "Expected value to be defined, but received " + String(value));
  }
  return value;
}
