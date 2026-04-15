function LIT(T) {
  return T.d[T.d.length - 1] & 1;
}
function oJT(T, R, a) {
  var e,
    t,
    r = new T(R[0]),
    h = 0;
  for (; ++h < R.length;) {
    if (t = new T(R[h]), !t.s) {
      r = t;
      break;
    }
    if (e = r.cmp(t), e === a || e === 0 && r.s === a) r = t;
  }
  return r;
}