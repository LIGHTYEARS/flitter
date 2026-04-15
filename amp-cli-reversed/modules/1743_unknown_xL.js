function xL(T, R, a, e) {
  if (R === void 0 || T === null || T === void 0) return T;
  let t = R.type;
  if (bq(t, "array") && typeof T === "string") {
    let r = SmR(T);
    if (Array.isArray(r)) {
      let h = R.items;
      return r.map((i, c) => xL(i, h, `${a}[${c}]`, e));
    }
  }
  if (bq(t, "array") && Array.isArray(T)) {
    let r = R.items;
    return T.map((h, i) => xL(h, r, `${a}[${i}]`, e));
  }
  if (bq(t, "object") && typeof T === "object" && !Array.isArray(T)) {
    let r = R.properties;
    if (!r) return T;
    let h = new Set(Object.keys(r)),
      i = {};
    for (let [c, s] of Object.entries(T)) if (h.has(c)) {
      let A = r[c];
      i[c] = xL(s, A, `${a}.${c}`, e);
    } else e.push(`${a}.${c}`);
    return i;
  }
  return T;
}