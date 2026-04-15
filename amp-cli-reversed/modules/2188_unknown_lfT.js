function Qx0(T) {
  return "-" + T.toLowerCase();
}
function Zx0(T) {
  return T.charAt(1).toUpperCase();
}
function lfT(T) {
  let R = [],
    a = String(T || ""),
    e = a.indexOf(","),
    t = 0,
    r = !1;
  while (!r) {
    if (e === -1) e = a.length, r = !0;
    let h = a.slice(t, e).trim();
    if (h || !r) R.push(h);
    t = e + 1, e = a.indexOf(",", t);
  }
  return R;
}