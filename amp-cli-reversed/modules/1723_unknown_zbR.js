function qbR(T, {
  isBigEndian: R,
  isBigTiff: a
}) {
  let e = a ? Number(k9T(T, 8, R)) : fr(T, 32, 4, R),
    t = a ? Ct.COUNT_SIZE.BIG : Ct.COUNT_SIZE.STANDARD;
  return T.slice(e + t);
}
function zbR(T, R, a, e) {
  switch (R) {
    case Ct.TYPE.SHORT:
      return fr(T, 16, a, e);
    case Ct.TYPE.LONG:
      return fr(T, 32, a, e);
    case Ct.TYPE.LONG8:
      {
        let t = Number(k9T(T, a, e));
        if (t > Number.MAX_SAFE_INTEGER) throw TypeError("Value too large");
        return t;
      }
    default:
      return 0;
  }
}