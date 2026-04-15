function FbR(T, R) {
  let a = R ? Ct.ENTRY_SIZE.BIG : Ct.ENTRY_SIZE.STANDARD;
  if (T.length > a) return T.slice(a);
}
function GbR(T, {
  isBigEndian: R,
  isBigTiff: a
}) {
  let e = {},
    t = T;
  while (t?.length) {
    let r = fr(t, 16, 0, R),
      h = fr(t, 16, 2, R),
      i = a ? Number(k9T(t, 4, R)) : fr(t, 32, 4, R);
    if (r === 0) break;
    if (i === 1 && (h === Ct.TYPE.SHORT || h === Ct.TYPE.LONG || a && h === Ct.TYPE.LONG8)) {
      let c = a ? 12 : 8;
      e[r] = zbR(t, h, c, R);
    }
    t = FbR(t, a);
  }
  return e;
}