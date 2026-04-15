function MIT(T, R) {
  if (T.length > R) return T.length = R, !0;
}
function H40(T) {
  return new this(T).abs();
}
function W40(T) {
  return new this(T).acos();
}
function q40(T) {
  return new this(T).acosh();
}
function z40(T, R) {
  return new this(T).plus(R);
}
function F40(T) {
  return new this(T).asin();
}
function G40(T) {
  return new this(T).asinh();
}
function K40(T) {
  return new this(T).atan();
}
function V40(T) {
  return new this(T).atanh();
}
function X40(T, R) {
  T = new this(T), R = new this(R);
  var a,
    e = this.precision,
    t = this.rounding,
    r = e + 4;
  if (!T.s || !R.s) a = new this(NaN);else if (!T.d && !R.d) a = Cs(this, r, 1).times(R.s > 0 ? 0.25 : 0.75), a.s = T.s;else if (!R.d || T.isZero()) a = R.s < 0 ? Cs(this, e, t) : new this(0), a.s = T.s;else if (!T.d || R.isZero()) a = Cs(this, r, 1).times(0.5), a.s = T.s;else if (R.s < 0) this.precision = r, this.rounding = 1, a = this.atan(c3(T, R, r, 1)), R = Cs(this, r, 1), this.precision = e, this.rounding = t, a = T.s < 0 ? a.minus(R) : a.plus(R);else a = this.atan(c3(T, R, r, 1));
  return a;
}