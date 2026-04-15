function fv0(T) {
  T.exit(this.containerState.type);
}
function Iv0(T, R, a) {
  let e = this;
  return _8(T, t, "listItemPrefixWhitespace", e.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 5);
  function t(r) {
    let h = e.events[e.events.length - 1];
    return !Y9(r) && h && h[1].type === "listItemPrefixWhitespace" ? R(r) : a(r);
  }
}