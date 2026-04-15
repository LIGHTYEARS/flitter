function AGR(T) {
  if (!T.hunks || T.hunks.length === 0) return "";
  let R = [];
  for (let a of T.hunks) {
    R.push(`@@ -${a.sourceLine},${a.sourceSpan} +${a.destinationLine},${a.destinationSpan} @@`);
    for (let e of a.segments) {
      let t = e.type === "ADDED" ? "+" : e.type === "REMOVED" ? "-" : " ";
      for (let r of e.lines) R.push(`${t}${r.line}`);
    }
  }
  return R.join(`
`);
}