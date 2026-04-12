/**
 * ObservableSet - observable Set collection
 */
import type { IDisposable } from "./disposable";
import { Observable } from "./observable";
import { BehaviorSubject } from "./subject";

export class ObservableSet<T> extends Set<T> implements IDisposable {
  private _subject: BehaviorSubject<ReadonlySet<T>>;
  private _disposed = false;

  constructor(values?: Iterable<T>) {
    super(values);
    this._subject = new BehaviorSubject<ReadonlySet<T>>(new Set(this));
  }

  get observable(): Observable<ReadonlySet<T>> {
    return this._subject as unknown as Observable<ReadonlySet<T>>;
  }

  private _emit(): void {
    // Guard: during super() construction, _subject is not yet initialized
    if (!this._disposed && this._subject) this._subject.next(new Set(this));
  }

  override add(value: T): this {
    const sizeBefore = this.size;
    super.add(value);
    if (this.size !== sizeBefore) this._emit();
    return this;
  }

  override delete(value: T): boolean {
    const result = super.delete(value);
    if (result) this._emit();
    return result;
  }

  override clear(): void {
    const hadItems = this.size > 0;
    super.clear();
    if (hadItems) this._emit();
  }

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this._subject.complete();
  }
}
