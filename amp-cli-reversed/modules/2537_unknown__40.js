function _40(T, R) {
  if (T.length === 0) return "No issues found.";
  let a = (r, h, i) => {
      return `\x1B]8;;${`vscode://file/${rA.isAbsolute(h) ? h : rA.join(R, h)}:${i}`}\x07${r}\x1B]8;;\x07`;
    },
    e = new Map();
  for (let r of T) {
    let h = rA.isAbsolute(r.filename) ? rA.relative(R, r.filename) : r.filename,
      i = e.get(h);
    if (i) i.push(r);else e.set(h, [r]);
  }
  let t = [];
  for (let [r, h] of e.entries()) {
    t.push(`\u25CF ${r}`);
    for (let i = 0; i < h.length; i++) {
      let c = h[i],
        s = c.startLine ?? c.endLine,
        A = s && s > 0 ? oR.cyan(a(`@L${s}`, c.filename, s)) : null,
        l = c.source ? oR.dim.italic(` [${c.source}]`) : "";
      if (t.push(A ? `${A}${l} ${oR.dim(c.text)}` : `${l ? `${l} ` : ""}${oR.dim(c.text)}`), i < h.length - 1) t.push("");
    }
    t.push("");
  }
  return t.join(`
`).trimEnd();
}