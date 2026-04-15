function JqR(T) {
  let R = [];
  for (let a = 0; a < T.length; a++) {
    let e = T[a];
    if (!e) continue;
    if (R.push(`## Turn ${a + 1}`), e.message) R.push(`
**Agent Message:**
${e.message}
`);
    if (e.activeTools.size > 0) {
      R.push(`
**Tool Calls:**
`);
      for (let [, t] of e.activeTools) R.push(T5R(t));
    }
    R.push(`
---
`);
  }
  return R.join(`
`);
}