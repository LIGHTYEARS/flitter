function R7T(T) {
  return T.toSorted((R, a) => {
    let e = EG[R.type] - EG[a.type];
    if (e !== 0) return e;
    return R.uri.localeCompare(a.uri);
  });
}
function ZA(T, R = 1) {
  let a = zR.parse(T),
    e = MR.basename(a) || "AGENTS.md",
    t = [],
    r = MR.dirname(a);
  for (let h = 0; h < R; h++) {
    let i = MR.basename(r);
    if (!i || i === r.path) break;
    t.unshift(i);
    let c = MR.dirname(r);
    if (MR.equalURIs(c, r)) break;
    r = c;
  }
  if (t.length === 0) return e;
  return [...t, e].join("/");
}