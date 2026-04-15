function v$0(T, R, a) {
  let e = this;
  return t;
  function t(h) {
    if (e.parser.lazy[e.now().line]) return a(h);
    if (r9(h)) return T.enter("lineEnding"), T.consume(h), T.exit("lineEnding"), t;
    return _8(T, r, "linePrefix", 5)(h);
  }
  function r(h) {
    let i = e.events[e.events.length - 1];
    return i && i[1].type === "linePrefix" && i[2].sliceSerialize(i[1], !0).length >= 4 ? R(h) : r9(h) ? t(h) : a(h);
  }
}