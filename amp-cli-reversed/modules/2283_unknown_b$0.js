function wfT(T, R) {
  T.column += R, T.offset += R, T._bufferIndex += R;
}
function b$0(T, R, a) {
  let e = 0;
  return t;
  function t(n) {
    return T.enter("autolink"), T.enter("autolinkMarker"), T.consume(n), T.exit("autolinkMarker"), T.enter("autolinkProtocol"), r;
  }
  function r(n) {
    if (Mt(n)) return T.consume(n), h;
    if (n === 64) return a(n);
    return s(n);
  }
  function h(n) {
    if (n === 43 || n === 45 || n === 46 || Sr(n)) return e = 1, i(n);
    return s(n);
  }
  function i(n) {
    if (n === 58) return T.consume(n), e = 0, c;
    if ((n === 43 || n === 45 || n === 46 || Sr(n)) && e++ < 32) return T.consume(n), i;
    return e = 0, s(n);
  }
  function c(n) {
    if (n === 62) return T.exit("autolinkProtocol"), T.enter("autolinkMarker"), T.consume(n), T.exit("autolinkMarker"), T.exit("autolink"), R;
    if (n === null || n === 32 || n === 60 || TB(n)) return a(n);
    return T.consume(n), c;
  }
  function s(n) {
    if (n === 64) return T.consume(n), A;
    if (r$0(n)) return T.consume(n), s;
    return a(n);
  }
  function A(n) {
    return Sr(n) ? l(n) : a(n);
  }
  function l(n) {
    if (n === 46) return T.consume(n), e = 0, A;
    if (n === 62) return T.exit("autolinkProtocol").type = "autolinkEmail", T.enter("autolinkMarker"), T.consume(n), T.exit("autolinkMarker"), T.exit("autolink"), R;
    return o(n);
  }
  function o(n) {
    if ((n === 45 || Sr(n)) && e++ < 63) {
      let p = n === 45 ? o : l;
      return T.consume(n), p;
    }
    return a(n);
  }
}