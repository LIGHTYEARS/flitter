function kO0(T, R, a) {
  let e = 0;
  return t;
  function t(h) {
    if ((h === 87 || h === 119) && e < 3) return e++, T.consume(h), t;
    if (h === 46 && e === 3) return T.consume(h), r;
    return a(h);
  }
  function r(h) {
    return h === null ? a(h) : R(h);
  }
}