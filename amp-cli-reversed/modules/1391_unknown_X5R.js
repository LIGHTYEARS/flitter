function V5R(T, R) {
  let a = [...R].sort((t, r) => r.startLine - t.startLine),
    e = [...T];
  for (let t of a) e.splice(t.startLine, t.deleteCount, ...t.insertLines);
  return e;
}
function X5R(T, R, a) {
  let e = R.includes(`\r
`),
    t = R.replace(/\r\n/g, `
`).split(`
`);
  if (t.length > 0 && t[t.length - 1] === "") t.pop();
  let r = K5R(t, T, a),
    h = V5R(t, r);
  if (h.length === 0) h.push("", "");else if (h[h.length - 1] !== "") h.push("");
  let i = h.join(`
`);
  if (e) i = i.replace(/\n/g, `\r
`);
  return {
    unifiedDiff: Y5R(R, i),
    content: i
  };
}