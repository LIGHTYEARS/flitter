function U40(T, R) {
  var a,
    e = R.d.length;
  if (e < 3) return R.isZero() ? R : Tx(T, 2, R, R);
  a = 1.4 * Math.sqrt(e), a = a > 16 ? 16 : a | 0, R = R.times(1 / QH(5, a)), R = Tx(T, 2, R, R);
  var t,
    r = new T(5),
    h = new T(16),
    i = new T(20);
  for (; a--;) t = R.times(R), R = R.times(r.plus(t.times(h.times(t).minus(i))));
  return R;
}