function HX(T, R) {
  let a = R.map(e => e.diff ? RS(e.diff) : []);
  return T.filter(e => {
    for (let [t, r] of R.entries()) {
      let h = a[t] ?? [];
      if (MzT(e, r, h)) return !1;
    }
    return !0;
  }).map(e => o2R(e));
}