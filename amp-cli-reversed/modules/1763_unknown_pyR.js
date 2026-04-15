function AyR(T) {
  let R = typeof T === "string" ? new URL(T) : new URL(T.href);
  return R.hash = "", R;
}
function pyR({
  requestedResource: T,
  configuredResource: R
}) {
  let a = typeof T === "string" ? new URL(T) : new URL(T.href),
    e = typeof R === "string" ? new URL(R) : new URL(R.href);
  if (a.origin !== e.origin) return !1;
  if (a.pathname.length < e.pathname.length) return !1;
  let t = a.pathname.endsWith("/") ? a.pathname : a.pathname + "/",
    r = e.pathname.endsWith("/") ? e.pathname : e.pathname + "/";
  return t.startsWith(r);
}