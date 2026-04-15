function _c(T) {
  return T.replace(/[\t\n\r ]+/g, " ").replace(/^ | $/g, "").toLowerCase().toUpperCase();
}
function TB(T) {
  return T !== null && (T < 32 || T === 127);
}
function r9(T) {
  return T !== null && T < -2;
}
function o3(T) {
  return T !== null && (T < 0 || T === 32);
}
function Y9(T) {
  return T === -2 || T === -1 || T === 32;
}
function mp(T) {
  return R;
  function R(a) {
    return a !== null && a > -1 && T.test(String.fromCharCode(a));
  }
}
function _8(T, R, a, e) {
  let t = e ? e - 1 : Number.POSITIVE_INFINITY,
    r = 0;
  return h;
  function h(c) {
    if (Y9(c)) return T.enter(a), i(c);
    return R(c);
  }
  function i(c) {
    if (Y9(c) && r++ < t) return T.consume(c), i;
    return T.exit(a), R(c);
  }
}