function bzT(T) {
  if (!T) return;
  let [R, a] = T;
  if (R < 1 || a < R) return;
  if (R === a) return `L${R}`;
  return `L${R}-${a}`;
}
function bzR(T) {
  let R = T.map(a => bzT(a)).filter(a => Boolean(a));
  if (R.length === 0) return;
  return R.join(",");
}
function mzR(T) {
  let R = T[T.length - 1];
  if (!R) return;
  let a = vA(R.program);
  if (!a) return;
  let e = qb(R);
  if (!e) return;
  return _zT(a, e);
}
function WO(T, R) {
  let a = T.trim(),
    e = gzR(a, R),
    t = MuT.get(e);
  if (!t) t = IzR(a, R), MuT.set(e, t);
  return t.readRange ? {
    ...t,
    readRange: [...t.readRange]
  } : {
    ...t
  };
}