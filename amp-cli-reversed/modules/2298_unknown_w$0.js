function w$0(T, R, a) {
  let e = this;
  return t;
  function t(h) {
    return T.exit("chunkContent"), T.enter("lineEnding"), T.consume(h), T.exit("lineEnding"), _8(T, r, "linePrefix");
  }
  function r(h) {
    if (h === null || r9(h)) return a(h);
    let i = e.events[e.events.length - 1];
    if (!e.parser.constructs.disable.null.includes("codeIndented") && i && i[1].type === "linePrefix" && i[2].sliceSerialize(i[1], !0).length >= 4) return R(h);
    return T.interrupt(e.parser.constructs.flow, a, R)(h);
  }
}