function aL0(T, R) {
  return new this(T).div(R);
}
function eL0(T) {
  return new this(T).exp();
}
function tL0(T) {
  return Q0(T = new this(T), T.e + 1, 3);
}
function rL0() {
  var T,
    R,
    a = new this(0);
  g9 = !1;
  for (T = 0; T < arguments.length;) if (R = new this(arguments[T++]), !R.d) {
    if (R.s) return g9 = !0, new this(1 / 0);
    a = R;
  } else if (a.d) a = a.plus(R.times(R));
  return g9 = !0, a.sqrt();
}