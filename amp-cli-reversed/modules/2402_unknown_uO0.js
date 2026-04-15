function AO0() {
  return [fS0(), zS0(), VS0(), aO0(), sO0()];
}
function pO0(T) {
  return {
    extensions: [IS0(), FS0(T), XS0(), cO0(T), oO0()]
  };
}
function mO0() {
  return {
    text: ho
  };
}
function uO0(T, R, a) {
  let e = this,
    t,
    r;
  return h;
  function h(l) {
    if (!ZY(l) || !OQT.call(e, e.previous) || crT(e.events)) return a(l);
    return T.enter("literalAutolink"), T.enter("literalAutolinkEmail"), i(l);
  }
  function i(l) {
    if (ZY(l)) return T.consume(l), i;
    if (l === 64) return T.consume(l), c;
    return a(l);
  }
  function c(l) {
    if (l === 46) return T.check(bO0, A, s)(l);
    if (l === 45 || l === 95 || Sr(l)) return r = !0, T.consume(l), c;
    return A(l);
  }
  function s(l) {
    return T.consume(l), t = !0, c;
  }
  function A(l) {
    if (r && t && Mt(e.previous)) return T.exit("literalAutolinkEmail"), T.exit("literalAutolink"), R(l);
    return a(l);
  }
}