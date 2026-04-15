function $v0(T, R, a) {
  let e = this,
    t;
  return r;
  function r(s) {
    let A = e.events.length,
      l;
    while (A--) if (e.events[A][1].type !== "lineEnding" && e.events[A][1].type !== "linePrefix" && e.events[A][1].type !== "content") {
      l = e.events[A][1].type === "paragraph";
      break;
    }
    if (!e.parser.lazy[e.now().line] && (e.interrupt || l)) return T.enter("setextHeadingLine"), t = s, h(s);
    return a(s);
  }
  function h(s) {
    return T.enter("setextHeadingLineSequence"), i(s);
  }
  function i(s) {
    if (s === t) return T.consume(s), i;
    return T.exit("setextHeadingLineSequence"), Y9(s) ? _8(T, c, "lineSuffix")(s) : c(s);
  }
  function c(s) {
    if (s === null || r9(s)) return T.exit("setextHeadingLine"), R(s);
    return a(s);
  }
}