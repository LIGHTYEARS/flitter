function FdT(T) {
  let R = qA(T.replace(/\/+$/, "")),
    a = R.lastIndexOf(".");
  if (a === 0 || a === -1) return "";
  return R.slice(a);
}
function Kt(T) {
  try {
    if (T = I8(T), T.scheme === "file") return T.fsPath;
  } catch {}
  return T.toString();
}
function lnR(T) {
  if (T.startsWith(lb)) return T;
  if (GdT.test(T)) return `${lb}${T.replace(/\\/g, lb)}`;
  return;
}
function AnR(T, ...R) {
  return T = I8(T), T.with({
    path: xD(T.path, ...R)
  });
}
function pnR(T, ...R) {
  let a = T.path,
    e = !1;
  if (a[0] !== lb) a = lb + a, e = !0;
  let t = a;
  for (let r of R) {
    let h = lnR(r);
    if (h) t = xD(h);else t = xD(t, r);
  }
  if (t !== "/" && t.endsWith("/")) t = t.replace(/\/+$/, "");
  if (e && t[0] === lb && !T.authority) t = t.substring(1);
  return T.with({
    path: t
  });
}