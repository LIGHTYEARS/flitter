function bU0(T, R, a, e) {
  if (T.length === 0) return [];
  if (T.length === 1) {
    let A = e > 0 ? (T[0]?.value ?? 0) / e : 0,
      l = Math.floor(R / 2),
      o = Math.round((1 - A) * (a - 1));
    return [[l, o]];
  }
  let t = T.length,
    r = [],
    h = [];
  for (let A = 0; A < t; A++) {
    let l = T[A];
    if (!l) continue;
    r.push(Math.round(A / (t - 1) * (R - 1)));
    let o = e > 0 ? l.value / e : 0;
    h.push((1 - o) * (a - 1));
  }
  if (r.length < 2) {
    if (r.length === 1) return [[r[0], Math.round(h[0])]];
    return [];
  }
  let i = PRR(r, h),
    c = [],
    s = 0;
  for (let A = 0; A < R; A++) {
    while (s < r.length - 2 && A > r[s + 1]) s++;
    let l = kRR(i, A, s),
      o = Math.round(Math.max(0, Math.min(a - 1, l)));
    c.push([A, o]);
  }
  return c;
}