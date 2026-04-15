function BL(T) {
  return typeof T === "object" && T !== null && dP in T;
}
function Z7T(T, R) {
  let a = new Set();
  if (T) {
    for (let e of T) if (BL(e)) a.add(e[dP]);
  }
  if (R) for (let e of R) {
    if (BL(e)) a.add(e[dP]);
    if (Array.isArray(e.content)) {
      for (let t of e.content) if (BL(t)) a.add(t[dP]);
    }
  }
  return Array.from(a);
}