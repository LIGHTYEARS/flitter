function _nR(T) {
  if (T = I8(T), T.path.length === 0 || T.path === lb) return T;
  let R = onR(T.path);
  if (R.length === 1 && R === ".") R = "";
  return T.with({
    path: R
  });
}
function bnR(T, R) {
  if (R.scheme !== T.scheme || (R.authority ?? "") !== (T.authority ?? "")) return !1;
  let a = R.scheme === "file" && R.path.match(/^\/[A-Za-z]:/),
    e = a ? R.path.slice(0, 2).toUpperCase() + R.path.slice(2) : R.path,
    t = a ? T.path.slice(0, 2).toUpperCase() + T.path.slice(2) : T.path;
  return t === e || t.startsWith(e.endsWith("/") ? e : `${e}/`) || e.endsWith("/") && t === e.slice(0, -1);
}