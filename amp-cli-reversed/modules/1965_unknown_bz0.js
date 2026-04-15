function pz0(T) {
  return T.replace(/\s+/g, " ").trim();
}
function _z0(T) {
  if (T.startsWith("builtin://")) return "(built-in skill)";
  if (!T.startsWith("file://")) return T;
  try {
    return bhT(gW(T));
  } catch {
    return T;
  }
}
function bz0(T, R) {
  if (T === R) return !0;
  let a = Object.keys(T),
    e = Object.keys(R);
  if (a.length !== e.length) return !1;
  for (let t of a) {
    if (!(t in R)) return !1;
    if (!Object.is(T[t], R[t])) return !1;
  }
  return !0;
}