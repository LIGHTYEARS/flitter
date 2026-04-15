function AU0(T, R, a, e, t, r, h) {
  if (e.length === 0) return;
  let i = {
      fg: LT.index(7),
      dim: !0
    },
    c = r ?? e.length * t;
  for (let l = 0; l < c; l++) T.setCell(R + l, a, a9("\u2500", i));
  let s = Math.max(...e.map(l => l.length)) + 2,
    A = h || t >= s ? 1 : Math.max(1, Math.ceil(s / Math.max(1, t)));
  for (let l = 0; l < e.length; l += A) {
    let o = e[l];
    if (!o) continue;
    let n = R + (r ? Math.round(l / Math.max(1, e.length - 1) * (c - 1)) : l * t);
    T.setCell(n, a, a9("\u252C", i));
    let p = h ? l % 2 === 0 ? 1 : 3 : 1;
    for (let _ = 0; _ < o.length; _++) T.setCell(n + _, a + p, a9(o[_], i));
  }
}