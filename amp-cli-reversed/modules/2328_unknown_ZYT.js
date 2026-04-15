function ZYT(T) {
  return {
    resolveAll: JYT(T === "text" ? Ev0 : void 0),
    tokenize: R
  };
  function R(a) {
    let e = this,
      t = this.parser.constructs[T],
      r = a.attempt(t, h, i);
    return h;
    function h(A) {
      return s(A) ? r(A) : i(A);
    }
    function i(A) {
      if (A === null) {
        a.consume(A);
        return;
      }
      return a.enter("data"), a.consume(A), c;
    }
    function c(A) {
      if (s(A)) return a.exit("data"), r(A);
      return a.consume(A), c;
    }
    function s(A) {
      if (A === null) return !0;
      let l = t[A],
        o = -1;
      if (l) while (++o < l.length) {
        let n = l[o];
        if (!n.previous || n.previous.call(e, e.previous)) return !0;
      }
      return !1;
    }
  }
}