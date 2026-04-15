function bL0(T) {
  return Q0(T = new this(T), T.e + 1, this.rounding);
}
function mL0(T) {
  return T = new this(T), T.d ? T.d[0] ? T.s : 0 * T.s : T.s || NaN;
}
function uL0(T) {
  return new this(T).sin();
}
function yL0(T) {
  return new this(T).sinh();
}
function PL0(T) {
  return new this(T).sqrt();
}
function kL0(T, R) {
  return new this(T).sub(R);
}
function xL0() {
  var T = 0,
    R = arguments,
    a = new this(R[T]);
  g9 = !1;
  for (; a.s && ++T < R.length;) a = a.plus(R[T]);
  return g9 = !0, Q0(a, this.precision, this.rounding);
}
function fL0(T) {
  return new this(T).tan();
}
function IL0(T) {
  return new this(T).tanh();
}
function gL0(T) {
  return Q0(T = new this(T), T.e + 1, 1);
}
function $L0(T, R) {
  let a = R.decimalPlaces === "more-if-tiny" ? Math.abs(T) < 0.01 ? KF + 1 : KF : R.decimalPlaces ?? KF,
    e = R.intent === "balance" ? T < 0 ? "expand" : "trunc" : "halfExpand";
  return {
    decimalPlaces: a,
    roundingMode: e
  };
}