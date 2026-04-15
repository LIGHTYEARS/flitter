function Pv0(T, R, a) {
  let e = this,
    t = e.events[e.events.length - 1],
    r = t && t[1].type === "linePrefix" ? t[2].sliceSerialize(t[1], !0).length : 0,
    h = 0;
  return i;
  function i(n) {
    let p = e.containerState.type || (n === 42 || n === 43 || n === 45 ? "listUnordered" : "listOrdered");
    if (p === "listUnordered" ? !e.containerState.marker || n === e.containerState.marker : KY(n)) {
      if (!e.containerState.type) e.containerState.type = p, T.enter(p, {
        _container: !0
      });
      if (p === "listUnordered") return T.enter("listItemPrefix"), n === 42 || n === 45 ? T.check(WM, a, s)(n) : s(n);
      if (!e.interrupt || n === 49) return T.enter("listItemPrefix"), T.enter("listItemValue"), c(n);
    }
    return a(n);
  }
  function c(n) {
    if (KY(n) && ++h < 10) return T.consume(n), c;
    if ((!e.interrupt || h < 2) && (e.containerState.marker ? n === e.containerState.marker : n === 41 || n === 46)) return T.exit("listItemValue"), s(n);
    return a(n);
  }
  function s(n) {
    return T.enter("listItemMarker"), T.consume(n), T.exit("listItemMarker"), e.containerState.marker = e.containerState.marker || n, T.check(JO, e.interrupt ? a : A, T.attempt(uv0, o, l));
  }
  function A(n) {
    return e.containerState.initialBlankLine = !0, r++, o(n);
  }
  function l(n) {
    if (Y9(n)) return T.enter("listItemPrefixWhitespace"), T.consume(n), T.exit("listItemPrefixWhitespace"), o;
    return a(n);
  }
  function o(n) {
    return e.containerState.size = r + e.sliceSerialize(T.exit("listItemPrefix"), !0).length, R(n);
  }
}