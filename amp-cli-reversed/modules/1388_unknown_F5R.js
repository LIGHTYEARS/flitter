function nz(T) {
  let R = T.match(/^[\t ]*/);
  return R ? R[0] : "";
}
function F5R(T, R, a, e) {
  if (e === "exact") return a;
  let t = [...a],
    r = Math.min(R.length, a.length, T.length);
  for (let h = 0; h < r; h++) {
    let i = T[h],
      c = R[h],
      s = a[h];
    if (c.trim() === s.trim()) {
      t[h] = i;
      continue;
    }
    let A = nz(c),
      l = nz(s);
    if (A !== l) continue;
    let o = nz(i);
    t[h] = `${o}${s.trimStart()}`;
  }
  return t;
}