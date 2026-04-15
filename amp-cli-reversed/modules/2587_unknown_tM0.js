function tM0(T, R, a) {
  let e = {};
  for (let [t, r] of Object.entries(T)) {
    let h = RM0(R.properties, t),
      i = h?.type;
    if (Array.isArray(r)) {
      let c = h?.items?.type ?? "string";
      e[t] = r.map(s => VF(s, c, a, t));
    } else if (i === "array") {
      let c = h?.items?.type ?? "string";
      e[t] = [VF(r, c, a, t)];
    } else e[t] = VF(r, i, a, t);
  }
  return e;
}