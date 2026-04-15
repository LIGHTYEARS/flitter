function jw0(T, R, a, e) {
  if (R && R.has(e)) return !0;
  if (T && T.has(a)) return !0;
  return !1;
}
function Sw0(T, R, a = ">") {
  let e,
    t = "";
  for (let r = R; r < T.length; r++) {
    let h = T[r];
    if (e) {
      if (h === e) e = "";
    } else if (h === '"' || h === "'") e = h;else if (h === a[0]) {
      if (a[1]) {
        if (T[r + 1] === a[1]) return {
          data: t,
          index: r
        };
      } else return {
        data: t,
        index: r
      };
    } else if (h === "\t") h = " ";
    t += h;
  }
}