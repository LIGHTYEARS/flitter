function DwR(T, R, a) {
  for (let e of R) if (MwR(T, e, a)) return !0;
  return !1;
}
function wwR(T, R) {
  if (T.length === 0) return [];
  let a = [],
    e = [];
  for (let t of T) {
    if (DwR(t, e, R)) {
      if (e.length > 0) a.push(e), e = [];
    }
    e.push(t);
  }
  if (e.length > 0) a.push(e);
  return a;
}