function cxT(T, R) {
  let a = R?.decimalPlaces ?? 2;
  if (T < 1024) return `${T} ${o9(T, "byte")}`;
  let e = T / 1024,
    t = 0;
  while (e >= 1024 && t < ixT.length - 1) e /= 1024, t += 1;
  let r = ixT[t];
  if (!r) throw Error(`(bug) missing byte size unit for index ${t}`);
  return `${e.toFixed(a)} ${r}`;
}