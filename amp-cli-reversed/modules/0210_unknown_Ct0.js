function Ct0(T) {
  if (T === void 0 || T === null || T === lGT) return [];
  let R = [],
    a = "",
    e = !1,
    t = !1;
  for (let r = 0; r < T.length; r++) {
    let h = T[r];
    if (e) {
      if (h === "0") t = !0;else a += h;
      e = !1;
    } else if (h === "\\") e = !0;else if (h === y1) {
      if (t) R.push(""), t = !1;else R.push(a);
      a = "";
    } else a += h;
  }
  if (e) R.push(a + "\\");else if (t) R.push("");else if (a !== "" || R.length > 0) R.push(a);
  return R;
}