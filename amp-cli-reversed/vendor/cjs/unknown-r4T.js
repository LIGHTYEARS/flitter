// Module: unknown-r4T
// Original: r4T
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

(T, R) => {
  var a = EpR(),
    e = CpR(),
    t = mN(),
    r = bN(),
    h = (c) => c && typeof c === "object" && !Array.isArray(c),
    i = (c, s, A = !1) => {
      if (Array.isArray(c)) {
        let y = c.map((u) => i(u, s, A));
        return (u) => {
          for (let P of y) {
            let k = P(u);
            if (k) return k;
          }
          return !1;
        };
      }
      let l = h(c) && c.tokens && c.input;
      if (c === "" || (typeof c !== "string" && !l))
        throw TypeError("Expected pattern to be a non-empty string");
      let o = s || {},
        n = o.windows,
        p = l ? i.compileRe(c, s) : i.makeRe(c, s, !1, !0),
        _ = p.state;
      delete p.state;
      let m = () => !1;
      if (o.ignore) {
        let y = { ...s, ignore: null, onMatch: null, onResult: null };
        m = i(o.ignore, y, A);
      }
      let b = (y, u = !1) => {
        let {
            isMatch: P,
            match: k,
            output: x,
          } = i.test(y, p, s, { glob: c, posix: n }),
          f = {
            glob: c,
            state: _,
            regex: p,
            posix: n,
            input: y,
            output: x,
            match: k,
            isMatch: P,
          };
        if (typeof o.onResult === "function") o.onResult(f);
        if (P === !1) return ((f.isMatch = !1), u ? f : !1);
        if (m(y)) {
          if (typeof o.onIgnore === "function") o.onIgnore(f);
          return ((f.isMatch = !1), u ? f : !1);
        }
        if (typeof o.onMatch === "function") o.onMatch(f);
        return u ? f : !0;
      };
      if (A) b.state = _;
      return b;
    };
  ((i.test = (c, s, A, { glob: l, posix: o } = {}) => {
    if (typeof c !== "string") throw TypeError("Expected input to be a string");
    if (c === "") return { isMatch: !1, output: "" };
    let n = A || {},
      p = n.format || (o ? t.toPosixSlashes : null),
      _ = c === l,
      m = _ && p ? p(c) : c;
    if (_ === !1) ((m = p ? p(c) : c), (_ = m === l));
    if (_ === !1 || n.capture === !0)
      if (n.matchBase === !0 || n.basename === !0) _ = i.matchBase(c, s, A, o);
      else _ = s.exec(m);
    return { isMatch: Boolean(_), match: _, output: m };
  }),
    (i.matchBase = (c, s, A) => {
      return (s instanceof RegExp ? s : i.makeRe(s, A)).test(t.basename(c));
    }),
    (i.isMatch = (c, s, A) => i(s, A)(c)),
    (i.parse = (c, s) => {
      if (Array.isArray(c)) return c.map((A) => i.parse(A, s));
      return e(c, { ...s, fastpaths: !1 });
    }),
    (i.scan = (c, s) => a(c, s)),
    (i.compileRe = (c, s, A = !1, l = !1) => {
      if (A === !0) return c.output;
      let o = s || {},
        n = o.contains ? "" : "^",
        p = o.contains ? "" : "$",
        _ = `${n}(?:${c.output})${p}`;
      if (c && c.negated === !0) _ = `^(?!${_}).*$`;
      let m = i.toRegex(_, s);
      if (l === !0) m.state = c;
      return m;
    }),
    (i.makeRe = (c, s = {}, A = !1, l = !1) => {
      if (!c || typeof c !== "string")
        throw TypeError("Expected a non-empty string");
      let o = { negated: !1, fastpaths: !0 };
      if (s.fastpaths !== !1 && (c[0] === "." || c[0] === "*"))
        o.output = e.fastpaths(c, s);
      if (!o.output) o = e(c, s);
      return i.compileRe(o, s, A, l);
    }),
    (i.toRegex = (c, s) => {
      try {
        let A = s || {};
        return new RegExp(c, A.flags || (A.nocase ? "i" : ""));
      } catch (A) {
        if (s && s.debug === !0) throw A;
        return /$^/;
      }
    }),
    (i.constants = r),
    (R.exports = i));
};
