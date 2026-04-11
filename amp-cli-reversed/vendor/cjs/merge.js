// Module: merge
// Original: xeR
// Type: CJS (RT wrapper)
// Exports: merge
// Category: util

// Module: xeR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }), (T.merge = void 0));
  var R = keR(),
    a = 20;
  function e(...o) {
    let n = o.shift(),
      p = new WeakMap();
    while (o.length > 0) n = r(n, o.shift(), 0, p);
    return n;
  }
  T.merge = e;
  function t(o) {
    if (i(o)) return o.slice();
    return o;
  }
  function r(o, n, p = 0, _) {
    let m;
    if (p > a) return;
    if ((p++, A(o) || A(n) || c(n))) m = t(n);
    else if (i(o)) {
      if (((m = o.slice()), i(n)))
        for (let b = 0, y = n.length; b < y; b++) m.push(t(n[b]));
      else if (s(n)) {
        let b = Object.keys(n);
        for (let y = 0, u = b.length; y < u; y++) {
          let P = b[y];
          m[P] = t(n[P]);
        }
      }
    } else if (s(o))
      if (s(n)) {
        if (!l(o, n)) return n;
        m = Object.assign({}, o);
        let b = Object.keys(n);
        for (let y = 0, u = b.length; y < u; y++) {
          let P = b[y],
            k = n[P];
          if (A(k))
            if (typeof k > "u") delete m[P];
            else m[P] = k;
          else {
            let x = m[P],
              f = k;
            if (h(o, P, _) || h(n, P, _)) delete m[P];
            else {
              if (s(x) && s(f)) {
                let v = _.get(x) || [],
                  g = _.get(f) || [];
                (v.push({ obj: o, key: P }),
                  g.push({ obj: n, key: P }),
                  _.set(x, v),
                  _.set(f, g));
              }
              m[P] = r(m[P], k, p, _);
            }
          }
        }
      } else m = n;
    return m;
  }
  function h(o, n, p) {
    let _ = p.get(o[n]) || [];
    for (let m = 0, b = _.length; m < b; m++) {
      let y = _[m];
      if (y.key === n && y.obj === o) return !0;
    }
    return !1;
  }
  function i(o) {
    return Array.isArray(o);
  }
  function c(o) {
    return typeof o === "function";
  }
  function s(o) {
    return !A(o) && !i(o) && !c(o) && typeof o === "object";
  }
  function A(o) {
    return (
      typeof o === "string" ||
      typeof o === "number" ||
      typeof o === "boolean" ||
      typeof o > "u" ||
      o instanceof Date ||
      o instanceof RegExp ||
      o === null
    );
  }
  function l(o, n) {
    if (!(0, R.isPlainObject)(o) || !(0, R.isPlainObject)(n)) return !1;
    return !0;
  }
};
