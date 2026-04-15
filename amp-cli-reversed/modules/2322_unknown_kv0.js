function kv0(T, R, a) {
  let e = this;
  return e.containerState._closeFlow = void 0, T.check(JO, t, r);
  function t(i) {
    return e.containerState.furtherBlankLines = e.containerState.furtherBlankLines || e.containerState.initialBlankLine, _8(T, R, "listItemIndent", e.containerState.size + 1)(i);
  }
  function r(i) {
    if (e.containerState.furtherBlankLines || !Y9(i)) return e.containerState.furtherBlankLines = void 0, e.containerState.initialBlankLine = void 0, h(i);
    return e.containerState.furtherBlankLines = void 0, e.containerState.initialBlankLine = void 0, T.attempt(yv0, R, h)(i);
  }
  function h(i) {
    return e.containerState._closeFlow = !0, e.interrupt = void 0, _8(T, T.attempt(nr, R, a), "linePrefix", e.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(i);
  }
}