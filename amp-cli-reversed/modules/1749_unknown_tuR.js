function rlT(T) {
  return T !== null && typeof T === "object" && !Array.isArray(T);
}
function tuR(T, R) {
  let a = {
    ...T
  };
  for (let e in R) {
    let t = e,
      r = R[t];
    if (r === void 0) continue;
    let h = a[t];
    if (rlT(h) && rlT(r)) a[t] = {
      ...h,
      ...r
    };else a[t] = r;
  }
  return a;
}