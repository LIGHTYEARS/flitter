function mU0(T, R, a) {
  let e = Array(R).fill(0);
  if (T.length === 0 || a <= 0) return e;
  if (T.length === 1) {
    let s = Math.max(0, Math.min(1, (T[0]?.value ?? 0) / a));
    return e.fill(s), e;
  }
  let t = T.length,
    r = [],
    h = [];
  for (let s = 0; s < t; s++) {
    let A = T[s];
    if (!A) continue;
    r.push(Math.round(s / (t - 1) * (R - 1))), h.push(A.value / a);
  }
  if (r.length < 2) {
    if (r.length === 1) e.fill(Math.max(0, Math.min(1, h[0])));
    return e;
  }
  let i = PRR(r, h),
    c = 0;
  for (let s = 0; s < R; s++) {
    while (c < r.length - 2 && s > r[c + 1]) c++;
    e[s] = Math.max(0, Math.min(1, kRR(i, s, c)));
  }
  return e;
}