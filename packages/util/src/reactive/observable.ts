/**
 * Observable - reactive data stream core
 *
 * Lightweight Observable implementation supporting subscribe/pipe/from/of
 */

export interface Observer<T> {
  next(value: T): void;
  error(err: unknown): void;
  complete(): void;
}

export interface Subscription {
  unsubscribe(): void;
  readonly closed: boolean;
}

export type OperatorFunction<T, R> = (source: Observable<T>) => Observable<R>;
export type ObservableInput<T> = Observable<T> | Iterable<T> | PromiseLike<T>;

const symbolObservable = Symbol.for("observable");

export class Observable<T> {
  protected _subscriber: (observer: Observer<T>) => (() => void) | void;

  constructor(subscriber: (observer: Observer<T>) => (() => void) | void) {
    this._subscriber = subscriber;
  }

  subscribe(observer: Partial<Observer<T>>): Subscription;
  subscribe(
    next?: (value: T) => void,
    error?: (err: unknown) => void,
    complete?: () => void,
  ): Subscription;
  subscribe(
    observerOrNext?: Partial<Observer<T>> | ((value: T) => void),
    error?: (err: unknown) => void,
    complete?: () => void,
  ): Subscription {
    let observer: Observer<T>;
    if (typeof observerOrNext === "function" || observerOrNext === undefined) {
      observer = {
        next: observerOrNext ?? (() => {}),
        error:
          error ??
          ((e) => {
            throw e;
          }),
        complete: complete ?? (() => {}),
      };
    } else {
      observer = {
        next: observerOrNext.next?.bind(observerOrNext) ?? (() => {}),
        error:
          observerOrNext.error?.bind(observerOrNext) ??
          ((e) => {
            throw e;
          }),
        complete: observerOrNext.complete?.bind(observerOrNext) ?? (() => {}),
      };
    }

    let closed = false;
    const safeObserver: Observer<T> = {
      next(value: T) {
        if (!closed) observer.next(value);
      },
      error(err: unknown) {
        if (!closed) {
          closed = true;
          observer.error(err);
        }
      },
      complete() {
        if (!closed) {
          closed = true;
          observer.complete();
        }
      },
    };

    let teardown: (() => void) | void;
    try {
      teardown = this._subscriber(safeObserver);
    } catch (err) {
      safeObserver.error(err);
    }

    return {
      get closed() {
        return closed;
      },
      unsubscribe() {
        if (!closed) {
          closed = true;
          if (typeof teardown === "function") teardown();
        }
      },
    };
  }

  pipe(): Observable<T>;
  pipe<R>(...operators: OperatorFunction<any, any>[]): Observable<R>;
  pipe(...operators: OperatorFunction<any, any>[]): Observable<any> {
    return operators.reduce(
      (source, op) => op(source),
      this as Observable<any>,
    );
  }

  static from<T>(input: ObservableInput<T>): Observable<T> {
    if (input instanceof Observable) return input;
    // Check if iterable
    if (
      input != null &&
      typeof (input as any)[Symbol.iterator] === "function"
    ) {
      return new Observable<T>((observer) => {
        for (const value of input as Iterable<T>) {
          observer.next(value);
        }
        observer.complete();
      });
    }
    // Promise-like
    if (input != null && typeof (input as any).then === "function") {
      return new Observable<T>((observer) => {
        (input as PromiseLike<T>).then(
          (value) => {
            observer.next(value);
            observer.complete();
          },
          (err) => {
            observer.error(err);
          },
        );
      });
    }
    throw new TypeError("Observable.from: unsupported input type");
  }

  static of<T>(...values: T[]): Observable<T> {
    return new Observable<T>((observer) => {
      for (const v of values) observer.next(v);
      observer.complete();
    });
  }

  [symbolObservable](): Observable<T> {
    return this;
  }
}
