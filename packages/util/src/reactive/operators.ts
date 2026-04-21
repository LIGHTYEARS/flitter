/**
 * Pipe operators - map, filter, distinctUntilChanged, throttleTime
 */
import { Observable, type OperatorFunction } from "./observable";

export function map<T, R>(fn: (value: T) => R): OperatorFunction<T, R> {
  return (source) =>
    new Observable<R>((observer) => {
      const sub = source.subscribe({
        next(value) {
          observer.next(fn(value));
        },
        error(err) {
          observer.error(err);
        },
        complete() {
          observer.complete();
        },
      });
      return () => sub.unsubscribe();
    });
}

export function filter<T>(predicate: (value: T) => boolean): OperatorFunction<T, T> {
  return (source) =>
    new Observable<T>((observer) => {
      const sub = source.subscribe({
        next(value) {
          if (predicate(value)) observer.next(value);
        },
        error(err) {
          observer.error(err);
        },
        complete() {
          observer.complete();
        },
      });
      return () => sub.unsubscribe();
    });
}

export function distinctUntilChanged<T>(compare?: (a: T, b: T) => boolean): OperatorFunction<T, T> {
  return (source) =>
    new Observable<T>((observer) => {
      let hasValue = false;
      let lastValue: T;
      const cmp = compare ?? ((a, b) => a === b);
      const sub = source.subscribe({
        next(value) {
          if (!hasValue || !cmp(lastValue, value)) {
            hasValue = true;
            lastValue = value;
            observer.next(value);
          }
        },
        error(err) {
          observer.error(err);
        },
        complete() {
          observer.complete();
        },
      });
      return () => sub.unsubscribe();
    });
}

/**
 * Throttle emissions: emit the first value immediately (leading edge),
 * then suppress further values for `durationMs`. If a value arrives during
 * the suppressed window and `trailing` is true, emit the latest value
 * when the window expires.
 *
 * 逆向: amp uses wnR(200, { leading: true, trailing: true }) in
 * azT.observeThreadEntries() (modules/1342:275) — RxJS throttleTime.
 *
 * @param durationMs - Throttle window in milliseconds
 * @param opts - { leading?: boolean, trailing?: boolean } (both default true)
 */
export function throttleTime<T>(
  durationMs: number,
  opts: { leading?: boolean; trailing?: boolean } = {},
): OperatorFunction<T, T> {
  const leading = opts.leading ?? true;
  const trailing = opts.trailing ?? true;

  return (source) =>
    new Observable<T>((observer) => {
      let timer: ReturnType<typeof setTimeout> | null = null;
      let trailingValue: T | undefined;
      let hasTrailing = false;

      const sub = source.subscribe({
        next(value) {
          if (timer === null) {
            // Not throttled — emit leading edge if enabled
            if (leading) observer.next(value);
            timer = setTimeout(() => {
              timer = null;
              if (trailing && hasTrailing) {
                observer.next(trailingValue!);
                hasTrailing = false;
                // Start a new throttle window for the trailing emission
                timer = setTimeout(() => {
                  timer = null;
                  if (trailing && hasTrailing) {
                    observer.next(trailingValue!);
                    hasTrailing = false;
                  }
                }, durationMs);
              }
            }, durationMs);
          } else {
            // During throttle window — store for trailing
            trailingValue = value;
            hasTrailing = true;
          }
        },
        error(err) {
          observer.error(err);
        },
        complete() {
          if (timer !== null) {
            clearTimeout(timer);
            timer = null;
          }
          if (trailing && hasTrailing) {
            observer.next(trailingValue!);
          }
          observer.complete();
        },
      });

      return () => {
        sub.unsubscribe();
        if (timer !== null) {
          clearTimeout(timer);
          timer = null;
        }
      };
    });
}
