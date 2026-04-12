/**
 * Pipe operators - map, filter, distinctUntilChanged
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

export function filter<T>(
  predicate: (value: T) => boolean,
): OperatorFunction<T, T> {
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

export function distinctUntilChanged<T>(
  compare?: (a: T, b: T) => boolean,
): OperatorFunction<T, T> {
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
