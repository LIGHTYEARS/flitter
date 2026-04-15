function IfT(T, R) {
  return R.some(a => T.startsWith(a));
}
function Wf0(T) {
  return T.name === PYT && T.publicId === null && (T.systemId === null || T.systemId === wf0);
}
function qf0(T) {
  if (T.name !== PYT) return oi.QUIRKS;
  let {
    systemId: R
  } = T;
  if (R && R.toLowerCase() === Bf0) return oi.QUIRKS;
  let {
    publicId: a
  } = T;
  if (a !== null) {
    if (a = a.toLowerCase(), Uf0.has(a)) return oi.QUIRKS;
    let e = R === null ? Nf0 : kYT;
    if (IfT(a, e)) return oi.QUIRKS;
    if (e = R === null ? xYT : Hf0, IfT(a, e)) return oi.LIMITED_QUIRKS;
  }
  return oi.NO_QUIRKS;
}