function IO0(T, R, a) {
  return e;
  function e(i) {
    if (i === 33 || i === 34 || i === 39 || i === 41 || i === 42 || i === 44 || i === 46 || i === 58 || i === 59 || i === 63 || i === 95 || i === 126) return T.consume(i), e;
    if (i === 38) return T.consume(i), r;
    if (i === 93) return T.consume(i), t;
    if (i === 60 || i === null || o3(i) || Qb(i)) return R(i);
    return a(i);
  }
  function t(i) {
    if (i === null || i === 40 || i === 91 || o3(i) || Qb(i)) return R(i);
    return e(i);
  }
  function r(i) {
    return Mt(i) ? h(i) : a(i);
  }
  function h(i) {
    if (i === 59) return T.consume(i), e;
    if (Mt(i)) return T.consume(i), h;
    return a(i);
  }
}