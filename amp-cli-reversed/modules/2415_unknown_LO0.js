function EO0(T, R, a) {
  return T.check(JO, R, T.attempt($O0, R, a));
}
function CO0(T) {
  T.exit("gfmFootnoteDefinition");
}
function LO0(T, R, a) {
  let e = this;
  return _8(T, t, "gfmFootnoteDefinitionIndent", 5);
  function t(r) {
    let h = e.events[e.events.length - 1];
    return h && h[1].type === "gfmFootnoteDefinitionIndent" && h[2].sliceSerialize(h[1], !0).length === 4 ? R(r) : a(r);
  }
}