function QH(T, R) {
  var a = T;
  while (--R) a *= T;
  return a;
}
function lJT(T, R) {
  var a,
    e = R.s < 0,
    t = Cs(T, T.precision, 1),
    r = t.times(0.5);
  if (R = R.abs(), R.lte(r)) return Zo = e ? 4 : 1, R;
  if (a = R.divToInt(t), a.isZero()) Zo = e ? 3 : 2;else {
    if (R = R.minus(a.times(t)), R.lte(r)) return Zo = LIT(a) ? e ? 2 : 3 : e ? 4 : 1, R;
    Zo = LIT(a) ? e ? 1 : 4 : e ? 3 : 2;
  }
  return R.minus(t).abs();
}