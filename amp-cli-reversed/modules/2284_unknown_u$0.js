function m$0(T, R, a) {
  return e;
  function e(r) {
    return Y9(r) ? _8(T, t, "linePrefix")(r) : t(r);
  }
  function t(r) {
    return r === null || r9(r) ? R(r) : a(r);
  }
}
function u$0(T, R, a) {
  let e = this;
  return t;
  function t(h) {
    if (h === 62) {
      let i = e.containerState;
      if (!i.open) T.enter("blockQuote", {
        _container: !0
      }), i.open = !0;
      return T.enter("blockQuotePrefix"), T.enter("blockQuoteMarker"), T.consume(h), T.exit("blockQuoteMarker"), r;
    }
    return a(h);
  }
  function r(h) {
    if (Y9(h)) return T.enter("blockQuotePrefixWhitespace"), T.consume(h), T.exit("blockQuotePrefixWhitespace"), T.exit("blockQuotePrefix"), R;
    return T.exit("blockQuotePrefix"), R(h);
  }
}