/**
 * Disposable pattern - resource cleanup infrastructure
 *
 * @example
 * ```ts
 * const collection = new DisposableCollection();
 * collection.add({ dispose: () => cleanup() });
 * collection.add(() => moreCleanup());
 * collection.dispose(); // calls both
 * ```
 */

export interface IDisposable {
  dispose(): void;
}

export class DisposableCollection implements IDisposable {
  private _items = new Set<IDisposable | (() => void)>();
  private _disposed = false;

  get disposed(): boolean {
    return this._disposed;
  }

  add(disposable: IDisposable): void;
  add(fn: () => void): void;
  add(item: IDisposable | (() => void)): void {
    if (this._disposed) {
      // Already disposed — immediately dispose the new item
      if (typeof item === "function") item();
      else item.dispose();
      return;
    }
    this._items.add(item);
  }

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    for (const item of this._items) {
      if (typeof item === "function") item();
      else item.dispose();
    }
    this._items.clear();
  }
}
