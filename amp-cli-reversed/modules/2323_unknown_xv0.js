function xv0(T, R, a) {
  let e = this;
  return _8(T, t, "listItemIndent", e.containerState.size + 1);
  function t(r) {
    let h = e.events[e.events.length - 1];
    return h && h[1].type === "listItemIndent" && h[2].sliceSerialize(h[1], !0).length === e.containerState.size ? R(r) : a(r);
  }
}