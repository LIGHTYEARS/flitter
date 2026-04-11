// Module: alias
// Original: CN
// Type: CJS (RT wrapper)
// Exports: Alias
// Category: util

// Module: CN (CJS)
(T) => {
  var R = H9T(),
    a = EN(),
    e = x8(),
    t = W9T(),
    r = ym();
  class h extends t.NodeBase {
    constructor(c) {
      super(e.ALIAS);
      ((this.source = c),
        Object.defineProperty(this, "tag", {
          set() {
            throw Error("Alias nodes cannot have tags");
          },
        }));
    }
    resolve(c, s) {
      let A;
      if (s?.aliasResolveCache) A = s.aliasResolveCache;
      else if (
        ((A = []),
        a.visit(c, {
          Node: (o, n) => {
            if (e.isAlias(n) || e.hasAnchor(n)) A.push(n);
          },
        }),
        s)
      )
        s.aliasResolveCache = A;
      let l = void 0;
      for (let o of A) {
        if (o === this) break;
        if (o.anchor === this.source) l = o;
      }
      return l;
    }
    toJSON(c, s) {
      if (!s) return { source: this.source };
      let { anchors: A, doc: l, maxAliasCount: o } = s,
        n = this.resolve(l, s);
      if (!n) {
        let _ = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
        throw ReferenceError(_);
      }
      let p = A.get(n);
      if (!p) (r.toJS(n, null, s), (p = A.get(n)));
      if (p?.res === void 0)
        throw ReferenceError(
          "This should not happen: Alias anchor was not resolved?",
        );
      if (o >= 0) {
        if (((p.count += 1), p.aliasCount === 0)) p.aliasCount = i(l, n, A);
        if (p.count * p.aliasCount > o)
          throw ReferenceError(
            "Excessive alias count indicates a resource exhaustion attack",
          );
      }
      return p.res;
    }
    toString(c, s, A) {
      let l = `*${this.source}`;
      if (c) {
        if (
          (R.anchorIsValid(this.source),
          c.options.verifyAliasOrder && !c.anchors.has(this.source))
        ) {
          let o = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
          throw Error(o);
        }
        if (c.implicitKey) return `${l} `;
      }
      return l;
    }
  }
  function i(c, s, A) {
    if (e.isAlias(s)) {
      let l = s.resolve(c),
        o = A && l && A.get(l);
      return o ? o.count * o.aliasCount : 0;
    } else if (e.isCollection(s)) {
      let l = 0;
      for (let o of s.items) {
        let n = i(c, o, A);
        if (n > l) l = n;
      }
      return l;
    } else if (e.isPair(s)) {
      let l = i(c, s.key, A),
        o = i(c, s.value, A);
      return Math.max(l, o);
    }
    return 1;
  }
  T.Alias = h;
};
