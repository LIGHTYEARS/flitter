function ib(T, R, a, e) {
  return `${T}${R}${a}${e}`;
}
function uxT(T) {
  let R = 0;
  if (T.up > 0) R |= 1;
  if (T.down > 0) R |= 2;
  if (T.left > 0) R |= 4;
  if (T.right > 0) R |= 8;
  return R;
}
function xm0(T) {
  let R = 0;
  if ((T & 1) !== 0) R++;
  if ((T & 2) !== 0) R++;
  if ((T & 4) !== 0) R++;
  if ((T & 8) !== 0) R++;
  return R;
}
function yxT(T) {
  return Cw[T] !== void 0;
}
function fm0(T, R) {
  let a = Cw[T],
    e = Cw[R];
  if (!a || !e) return null;
  let t = Math.max(a.up, e.up),
    r = Math.max(a.down, e.down),
    h = Math.max(a.left, e.left),
    i = Math.max(a.right, e.right),
    c = uxT({
      up: t,
      down: r,
      left: h,
      right: i,
      rounded: !1
    });
  if (xm0(c) >= 3) {
    let y = ib(t, r, h, i),
      u = bxT[y];
    if (u) return u;
  }
  let s = Math.max(t, r),
    A = Math.max(h, i),
    l = t === 0 ? 0 : s,
    o = r === 0 ? 0 : s,
    n = h === 0 ? 0 : A,
    p = i === 0 ? 0 : A,
    _ = ib(l, o, n, p),
    m = uxT({
      up: l,
      down: o,
      left: n,
      right: p,
      rounded: !1
    });
  if (a.rounded && e.rounded && l <= 1 && o <= 1 && n <= 1 && p <= 1 && (m === 10 || m === 6 || m === 9 || m === 5) && mxT[_]) return mxT[_];
  let b = bxT[_];
  if (b) return b;
  return R;
}