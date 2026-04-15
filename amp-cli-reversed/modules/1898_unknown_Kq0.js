function Gq0(T, R) {
  let a = lf(T.canvas);
  if (R.text.length === 0) return a;
  let e = Zq0(T, R.labelLine);
  return Kq0(a, e, R.text), a;
}
function Kq0(T, R, a) {
  if (R.length < 2) return;
  let e = Math.min(R[0].x, R[1].x),
    t = Math.max(R[0].x, R[1].x),
    r = Math.min(R[0].y, R[1].y),
    h = Math.max(R[0].y, R[1].y),
    i = e + Math.floor((t - e) / 2),
    c = r + Math.floor((h - r) / 2),
    s = i - Math.floor(a.length / 2);
  Iq0(T, {
    x: s,
    y: c
  }, a);
}