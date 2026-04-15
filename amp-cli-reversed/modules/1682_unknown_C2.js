function C2(T, R) {
  let a = R.split("."),
    e = T;
  for (let t of a) {
    if (e === null || e === void 0) return;
    if (Array.isArray(e)) {
      let r = parseInt(t, 10);
      if (isNaN(r) || r < 0 || r >= e.length) return;
      e = e[r];
    } else if (typeof e === "object") e = e[t];else return;
  }
  return e;
}