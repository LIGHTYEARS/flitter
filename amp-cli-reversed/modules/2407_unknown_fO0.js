function fO0(T, R) {
  let a = 0,
    e = 0;
  return t;
  function t(h) {
    if (h === 40) return a++, T.consume(h), t;
    if (h === 41 && e < a) return r(h);
    if (h === 33 || h === 34 || h === 38 || h === 39 || h === 41 || h === 42 || h === 44 || h === 46 || h === 58 || h === 59 || h === 60 || h === 63 || h === 93 || h === 95 || h === 126) return T.check(gQT, R, r)(h);
    if (h === null || o3(h) || Qb(h)) return R(h);
    return T.consume(h), t;
  }
  function r(h) {
    if (h === 41) e++;
    return T.consume(h), t;
  }
}