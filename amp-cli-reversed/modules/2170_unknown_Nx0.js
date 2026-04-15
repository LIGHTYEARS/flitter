function Dx0(T) {
  let R = T.replace(/\/+$/, ""),
    a = R.lastIndexOf("/");
  return (a === -1 ? R : R.slice(a + 1)).replace(/\.md$/i, "") || T;
}
function wx0(T, R) {
  let a = ye(R.result) ? R.result : void 0,
    e = ye(a?.check) ? a.check : void 0;
  return typeof e?.name === "string" ? e.name : Dx0(T);
}
function Bx0(T) {
  if (T.status !== "done") return;
  let R = ye(T.result) ? T.result : void 0;
  return Array.isArray(R?.issues) ? R.issues.length : void 0;
}
function Nx0(T) {
  let R = Object.entries(T).filter(([, a]) => a !== void 0 && a !== null && a !== "");
  if (R.length === 0) return;
  return R.map(([a, e]) => {
    let t = typeof e === "string" ? e : JSON.stringify(e);
    return `${a}: ${t}`;
  }).join(`
`);
}