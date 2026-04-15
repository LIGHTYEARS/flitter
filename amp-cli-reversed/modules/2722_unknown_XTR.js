class XTR {
  _items = [];
  _activeIndex = 0;
  get items() {
    return this._items;
  }
  get count() {
    return this._items.length;
  }
  get activeIndex() {
    return this._activeIndex;
  }
  get activeItem() {
    return this._items[this._activeIndex] ?? null;
  }
  enqueue(T) {
    if (this._items.push(T), this._items.length === 1) this._activeIndex = 0;
  }
  remove(T) {
    let R = this._items.indexOf(T);
    if (R === -1) return !1;
    if (this._items.splice(R, 1), this._items.length === 0) return this._activeIndex = 0, !0;
    if (this._activeIndex > R) return this._activeIndex -= 1, !0;
    if (this._activeIndex >= this._items.length) this._activeIndex = this._items.length - 1;
    return !0;
  }
  selectPrevious() {
    if (this._items.length <= 1) return;
    this._activeIndex = (this._activeIndex - 1 + this._items.length) % this._items.length;
  }
  selectNext() {
    if (this._items.length <= 1) return;
    this._activeIndex = (this._activeIndex + 1) % this._items.length;
  }
  clear() {
    let T = this._items;
    return this._items = [], this._activeIndex = 0, T;
  }
}