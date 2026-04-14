/**
 * Subject - multicast Observable
 * BehaviorSubject - Subject with current value
 */
import { Observable, type Observer, type Subscription } from "./observable";

export class Subject<T> extends Observable<T> {
  protected _observers: Set<Observer<T>> = new Set();
  protected _completed = false;
  protected _errored = false;
  protected _error: unknown;

  constructor() {
    // The subscriber function adds observers to the set when subscribe is called
    super((observer) => {
      if (this._errored) {
        observer.error(this._error);
        return;
      }
      if (this._completed) {
        observer.complete();
        return;
      }
      this._observers.add(observer);
      return () => {
        this._observers.delete(observer);
      };
    });
  }

  next(value: T): void {
    if (this._completed || this._errored) return;
    for (const obs of [...this._observers]) obs.next(value);
  }

  error(err: unknown): void {
    if (this._completed || this._errored) return;
    this._errored = true;
    this._error = err;
    for (const obs of [...this._observers]) obs.error(err);
    this._observers.clear();
  }

  complete(): void {
    if (this._completed || this._errored) return;
    this._completed = true;
    for (const obs of [...this._observers]) obs.complete();
    this._observers.clear();
  }
}

export class BehaviorSubject<T> extends Subject<T> {
  private _value: T;

  constructor(initialValue: T) {
    super();
    this._value = initialValue;
  }

  override next(value: T): void {
    this._value = value;
    super.next(value);
  }

  getValue(): T {
    return this._value;
  }

  get value(): T {
    return this._value;
  }

  override subscribe(observer: Partial<Observer<T>>): Subscription;
  override subscribe(
    next?: (value: T) => void,
    error?: (err: unknown) => void,
    complete?: () => void,
  ): Subscription;
  override subscribe(
    observerOrNext?: Partial<Observer<T>> | ((value: T) => void),
    error?: (err: unknown) => void,
    complete?: () => void,
  ): Subscription {
    // Call parent subscribe first to register the observer
    const sub = super.subscribe(observerOrNext as unknown as (value: T) => void, error, complete);
    // Then emit current value synchronously to the new subscriber
    if (!sub.closed) {
      if (typeof observerOrNext === "function") {
        observerOrNext(this._value);
      } else if (observerOrNext && typeof observerOrNext === "object" && observerOrNext.next) {
        observerOrNext.next(this._value);
      }
    }
    return sub;
  }
}
