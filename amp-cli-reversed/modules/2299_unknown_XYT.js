function XYT(T, R, a, e, t, r, h, i, c) {
  let s = c || Number.POSITIVE_INFINITY,
    A = 0;
  return l;
  function l(b) {
    if (b === 60) return T.enter(e), T.enter(t), T.enter(r), T.consume(b), T.exit(r), o;
    if (b === null || b === 32 || b === 41 || TB(b)) return a(b);
    return T.enter(e), T.enter(h), T.enter(i), T.enter("chunkString", {
      contentType: "string"
    }), _(b);
  }
  function o(b) {
    if (b === 62) return T.enter(r), T.consume(b), T.exit(r), T.exit(t), T.exit(e), R;
    return T.enter(i), T.enter("chunkString", {
      contentType: "string"
    }), n(b);
  }
  function n(b) {
    if (b === 62) return T.exit("chunkString"), T.exit(i), o(b);
    if (b === null || b === 60 || r9(b)) return a(b);
    return T.consume(b), b === 92 ? p : n;
  }
  function p(b) {
    if (b === 60 || b === 62 || b === 92) return T.consume(b), n;
    return n(b);
  }
  function _(b) {
    if (!A && (b === null || b === 41 || o3(b))) return T.exit("chunkString"), T.exit(i), T.exit(h), T.exit(e), R(b);
    if (A < s && b === 40) return T.consume(b), A++, _;
    if (b === 41) return T.consume(b), A--, _;
    if (b === null || b === 32 || b === 40 || TB(b)) return a(b);
    return T.consume(b), b === 92 ? m : _;
  }
  function m(b) {
    if (b === 40 || b === 41 || b === 92) return T.consume(b), _;
    return _(b);
  }
}