// Module: attribute-hash-map
// Original: BB
// Type: CJS (RT wrapper)
// Exports: AttributeHashMap, HashMap
// Category: util

// Module: BB (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.AttributeHashMap = T.HashMap = void 0));
  var R = Fs();
  class a {
    _hash;
    _valueMap = new Map();
    _keyMap = new Map();
    constructor(t) {
      this._hash = t;
    }
    get(t, r) {
      return ((r ??= this._hash(t)), this._valueMap.get(r));
    }
    getOrDefault(t, r) {
      let h = this._hash(t);
      if (this._valueMap.has(h)) return this._valueMap.get(h);
      let i = r();
      if (!this._keyMap.has(h)) this._keyMap.set(h, t);
      return (this._valueMap.set(h, i), i);
    }
    set(t, r, h) {
      if (((h ??= this._hash(t)), !this._keyMap.has(h))) this._keyMap.set(h, t);
      this._valueMap.set(h, r);
    }
    has(t, r) {
      return ((r ??= this._hash(t)), this._valueMap.has(r));
    }
    *keys() {
      let t = this._keyMap.entries(),
        r = t.next();
      while (r.done !== !0) (yield [r.value[1], r.value[0]], (r = t.next()));
    }
    *entries() {
      let t = this._valueMap.entries(),
        r = t.next();
      while (r.done !== !0)
        (yield [this._keyMap.get(r.value[0]), r.value[1], r.value[0]],
          (r = t.next()));
    }
    get size() {
      return this._valueMap.size;
    }
  }
  T.HashMap = a;
  class e extends a {
    constructor() {
      super(R.hashAttributes);
    }
  }
  T.AttributeHashMap = e;
};
