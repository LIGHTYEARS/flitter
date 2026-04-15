function kRR(T, R, a) {
  let e = T.xs[a],
    t = T.xs[a + 1] - e;
  if (t === 0) return T.ys[a];
  let r = (R - e) / t,
    h = r * r,
    i = h * r,
    c = 2 * i - 3 * h + 1,
    s = i - 2 * h + r,
    A = -2 * i + 3 * h,
    l = i - h;
  return c * T.ys[a] + s * t * T.m[a] + A * T.ys[a + 1] + l * t * T.m[a + 1];
}