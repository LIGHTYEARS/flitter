function nU0(T, R, a, e, t, r, h, i = !1) {
  let c = i ? yRR : W_,
    s = Math.abs(e - R),
    A = Math.abs(t - a),
    l = R < e ? 1 : -1,
    o = a < t ? 1 : -1,
    n = s - A,
    p = R,
    _ = a;
  while (!0) {
    if (c(T, p, _, r, h), p === e && _ === t) break;
    let m = 2 * n;
    if (m > -A) n -= A, p += l;
    if (m < s) n += s, _ += o;
  }
}