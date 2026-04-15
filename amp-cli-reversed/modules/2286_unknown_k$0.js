function P$0(T) {
  T.exit("blockQuote");
}
function k$0(T, R, a) {
  return e;
  function e(r) {
    return T.enter("characterEscape"), T.enter("escapeMarker"), T.consume(r), T.exit("escapeMarker"), t;
  }
  function t(r) {
    if (i$0(r)) return T.enter("characterEscapeValue"), T.consume(r), T.exit("characterEscapeValue"), T.exit("characterEscape"), R;
    return a(r);
  }
}