function r6T(T) {
  if (T.parts === void 0 || T.parts.length === 0) return !1;
  for (let R of T.parts) if (R === void 0 || Object.keys(R).length === 0) return !1;
  return !0;
}
function FvR(T) {
  if (T.length === 0) return;
  for (let R of T) if (R.role !== "user" && R.role !== "model") throw Error(`Role must be user or model, but got ${R.role}.`);
}
function GAT(T) {
  if (T === void 0 || T.length === 0) return [];
  let R = [],
    a = T.length,
    e = 0;
  while (e < a) if (T[e].role === "user") R.push(T[e]), e++;else {
    let t = [],
      r = !0;
    while (e < a && T[e].role === "model") {
      if (t.push(T[e]), r && !r6T(T[e])) r = !1;
      e++;
    }
    if (r) R.push(...t);else R.pop();
  }
  return R;
}