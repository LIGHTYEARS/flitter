// Module: collection
// Original: q9T
// Type: CJS (RT wrapper)
// Exports: Collection, collectionFromPath, isEmptyPath
// Category: util

// Module: q9T (CJS)
(T) => {
  var R = LN(),
    a = x8(),
    e = W9T();
  function t(i, c, s) {
    let A = s;
    for (let l = c.length - 1; l >= 0; --l) {
      let o = c[l];
      if (typeof o === "number" && Number.isInteger(o) && o >= 0) {
        let n = [];
        ((n[o] = A), (A = n));
      } else A = new Map([[o, A]]);
    }
    return R.createNode(A, void 0, {
      aliasDuplicateObjects: !1,
      keepUndefined: !1,
      onAnchor: () => {
        throw Error("This should not happen, please report a bug.");
      },
      schema: i,
      sourceObjects: new Map(),
    });
  }
  var r = (i) =>
    i == null || (typeof i === "object" && !!i[Symbol.iterator]().next().done);
  class h extends e.NodeBase {
    constructor(i, c) {
      super(i);
      Object.defineProperty(this, "schema", {
        value: c,
        configurable: !0,
        enumerable: !1,
        writable: !0,
      });
    }
    clone(i) {
      let c = Object.create(
        Object.getPrototypeOf(this),
        Object.getOwnPropertyDescriptors(this),
      );
      if (i) c.schema = i;
      if (
        ((c.items = c.items.map((s) =>
          a.isNode(s) || a.isPair(s) ? s.clone(i) : s,
        )),
        this.range)
      )
        c.range = this.range.slice();
      return c;
    }
    addIn(i, c) {
      if (r(i)) this.add(c);
      else {
        let [s, ...A] = i,
          l = this.get(s, !0);
        if (a.isCollection(l)) l.addIn(A, c);
        else if (l === void 0 && this.schema) this.set(s, t(this.schema, A, c));
        else
          throw Error(`Expected YAML collection at ${s}. Remaining path: ${A}`);
      }
    }
    deleteIn(i) {
      let [c, ...s] = i;
      if (s.length === 0) return this.delete(c);
      let A = this.get(c, !0);
      if (a.isCollection(A)) return A.deleteIn(s);
      else
        throw Error(`Expected YAML collection at ${c}. Remaining path: ${s}`);
    }
    getIn(i, c) {
      let [s, ...A] = i,
        l = this.get(s, !0);
      if (A.length === 0) return !c && a.isScalar(l) ? l.value : l;
      else return a.isCollection(l) ? l.getIn(A, c) : void 0;
    }
    hasAllNullValues(i) {
      return this.items.every((c) => {
        if (!a.isPair(c)) return !1;
        let s = c.value;
        return (
          s == null ||
          (i &&
            a.isScalar(s) &&
            s.value == null &&
            !s.commentBefore &&
            !s.comment &&
            !s.tag)
        );
      });
    }
    hasIn(i) {
      let [c, ...s] = i;
      if (s.length === 0) return this.has(c);
      let A = this.get(c, !0);
      return a.isCollection(A) ? A.hasIn(s) : !1;
    }
    setIn(i, c) {
      let [s, ...A] = i;
      if (A.length === 0) this.set(s, c);
      else {
        let l = this.get(s, !0);
        if (a.isCollection(l)) l.setIn(A, c);
        else if (l === void 0 && this.schema) this.set(s, t(this.schema, A, c));
        else
          throw Error(`Expected YAML collection at ${s}. Remaining path: ${A}`);
      }
    }
  }
  ((T.Collection = h), (T.collectionFromPath = t), (T.isEmptyPath = r));
};
