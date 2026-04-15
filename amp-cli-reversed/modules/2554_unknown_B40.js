function B40(T, R) {
  var a, e, t;
  if (R.isZero()) return R;
  if (e = R.d.length, e < 32) a = Math.ceil(e / 3), t = (1 / QH(4, a)).toString();else a = 16, t = "2.3283064365386962890625e-10";
  T.precision += a, R = Tx(T, 1, R.times(t), new T(1));
  for (var r = a; r--;) {
    var h = R.times(R);
    R = h.times(h).minus(h).times(8).plus(1);
  }
  return T.precision -= a, R;
}