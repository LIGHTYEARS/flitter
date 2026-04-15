function IuT(T) {
  if (!T.cmd) return;
  if (T.args) return [T.cmd, ...(T.args ?? [])].filter(R => R !== void 0).map(XqR).join(" ");
  return T.cmd;
}
function rzT() {
  return new VqR.Terminal({
    cols: 1000,
    rows: 500,
    allowProposedApi: !0,
    convertEol: !0,
    scrollback: 1e4,
    cursorBlink: !1
  });
}
function hzT(T, R = YqR) {
  let a = T.buffer.active,
    e = Math.max(0, R.maxCharacterLength),
    t = 0,
    r = [];
  for (let h = a.length - 1; h >= 0; h--) {
    let i = a.getLine(h);
    if (!i) throw Error("unreachable: line index does not exist");
    let c = i.translateToString(!1).trimEnd();
    if (c.trim().length === 0 && r.at(-1)?.trim().length === 0) continue;
    if (t += c.length, t > e) {
      if (r.length === 0) r.push(c);
      return {
        output: r.reverse().join(`
`),
        truncation: {
          prefixLinesOmitted: h + 1
        }
      };
    }
    r.push(c);
  }
  return {
    output: r.reverse().join(`
`)
  };
}