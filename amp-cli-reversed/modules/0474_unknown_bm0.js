function bm0(T) {
  let R = Boolean(T.isTTY),
    a = 0,
    e = !1;
  function t() {
    if (!R || !e) return;
    T.write(`
`), e = !1, a = 0;
  }
  function r(h) {
    if (!R) return;
    let i = h.padEnd(a, " ");
    T.write(`\r${i}`), e = !0, a = i.length;
  }
  return {
    flushProgressLine: t,
    renderProgress: r
  };
}