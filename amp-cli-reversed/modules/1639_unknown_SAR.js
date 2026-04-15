function SAR(T, R) {
  let a = R.toLowerCase();
  if (T.appPathMarkers.some(r => a.includes(r))) return !0;
  let e = a.trim().split(/\s+/)[0] ?? "",
    t = e.split("/").at(-1) ?? e;
  if (T.executableNames.includes(t)) return !0;
  return !1;
}