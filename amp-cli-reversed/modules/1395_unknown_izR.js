function vA(T) {
  if (T === xs) return;
  if (Array.isArray(T)) return;
  return T.trim().toLowerCase() || void 0;
}
function qb(T) {
  let R = [];
  for (let a of T.arguments) {
    if (a === xs) return null;
    if (Array.isArray(a)) return null;
    R.push(a);
  }
  return R;
}
function hzR(T, R) {
  if (!daT.has(T)) return;
  let a = pzT(R);
  if (!a) return;
  return {
    path: a,
    ...(_zT(T, R) ?? {})
  };
}
function izR(T) {
  if (!T.every(r => {
    let h = vA(r.program);
    return h !== void 0 && (daT.has(h) || AzT.has(h));
  })) return;
  let R = T[0];
  if (!R) return;
  let a = vA(R.program),
    e = qb(R),
    t = e ? pzT(e) : void 0;
  return {
    program: a,
    path: t,
    ...(mzR(T) ?? {})
  };
}