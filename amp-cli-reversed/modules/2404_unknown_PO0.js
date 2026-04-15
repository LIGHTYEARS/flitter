function PO0(T, R, a) {
  let e = this,
    t = "",
    r = !1;
  return h;
  function h(l) {
    if ((l === 72 || l === 104) && SQT.call(e, e.previous) && !crT(e.events)) return T.enter("literalAutolink"), T.enter("literalAutolinkHttp"), t += String.fromCodePoint(l), T.consume(l), i;
    return a(l);
  }
  function i(l) {
    if (Mt(l) && t.length < 5) return t += String.fromCodePoint(l), T.consume(l), i;
    if (l === 58) {
      let o = t.toLowerCase();
      if (o === "http" || o === "https") return T.consume(l), c;
    }
    return a(l);
  }
  function c(l) {
    if (l === 47) {
      if (T.consume(l), r) return s;
      return r = !0, c;
    }
    return a(l);
  }
  function s(l) {
    return l === null || TB(l) || o3(l) || Qb(l) || HH(l) ? a(l) : T.attempt(fQT, T.attempt(IQT, A), a)(l);
  }
  function A(l) {
    return T.exit("literalAutolinkHttp"), T.exit("literalAutolink"), R(l);
  }
}