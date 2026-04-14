/**
 * ObservableMap - observable Map collection
 */
import type { IDisposable } from "./disposable";
import type { Observable } from "./observable";
import { BehaviorSubject } from "./subject";

export class ObservableMap<K, V> extends Map<K, V> implements IDisposable {
  private _subject: BehaviorSubject<ReadonlyMap<K, V>>;
  private _disposed = false;

  constructor(entries?: Iterable<readonly [K, V]>) {
    super(entries);
    this._subject = new BehaviorSubject<ReadonlyMap<K, V>>(new Map(this));
  }

  get observable(): Observable<ReadonlyMap<K, V>> {
    return this._subject as unknown as Observable<ReadonlyMap<K, V>>;
  }

  private _emit(): void {
    // Guard: during super() construction, _subject is not yet initialized
    if (!this._disposed && this._subject) this._subject.next(new Map(this));
  }

  override set(key: K, value: V): this {
    super.set(key, value);
    this._emit();
    return this;
  }

  override delete(key: K): boolean {
    const result = super.delete(key);
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
