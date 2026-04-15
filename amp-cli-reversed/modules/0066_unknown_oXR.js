function oXR(T) {
  if (T.length === 0) return "Task was cancelled before any work was done.";
  let R = [],
    a = [];
  for (let t of T) for (let [, r] of t.activeTools) if (r.status === "done") R.push(r);else if (r.status === "in-progress" || r.status === "queued") a.push(r);
  let e = ["Task was cancelled."];
  if (R.length > 0) {
    e.push(`

## Completed work:
`);
    for (let t of R) e.push(`
### ${ryT(t, !0)}
`);
  }
  if (a.length > 0) {
    let t = a.map(r => ryT(r, !1)).join(", ");
    e.push(`

## In progress when cancelled:
${t}`);
  }
  return e.join("");
}