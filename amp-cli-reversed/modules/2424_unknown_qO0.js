function Wy(T, R) {
  let a = T[R],
    e = a[0] === "enter" ? "start" : "end";
  return a[1][e];
}
function WO0() {
  return {
    text: {
      [91]: HO0
    }
  };
}
function qO0(T, R, a) {
  let e = this;
  return t;
  function t(c) {
    if (e.previous !== null || !e._gfmTasklistFirstContentOfListItem) return a(c);
    return T.enter("taskListCheck"), T.enter("taskListCheckMarker"), T.consume(c), T.exit("taskListCheckMarker"), r;
  }
  function r(c) {
    if (o3(c)) return T.enter("taskListCheckValueUnchecked"), T.consume(c), T.exit("taskListCheckValueUnchecked"), h;
    if (c === 88 || c === 120) return T.enter("taskListCheckValueChecked"), T.consume(c), T.exit("taskListCheckValueChecked"), h;
    return a(c);
  }
  function h(c) {
    if (c === 93) return T.enter("taskListCheckMarker"), T.consume(c), T.exit("taskListCheckMarker"), T.exit("taskListCheck"), i;
    return a(c);
  }
  function i(c) {
    if (r9(c)) return R(c);
    if (Y9(c)) return T.check({
      tokenize: zO0
    }, R, a)(c);
    return a(c);
  }
}