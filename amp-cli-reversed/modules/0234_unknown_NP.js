function xr0(T) {
  let R = T === void 0 ? {} : typeof T === "string" ? {
      endpoint: T
    } : T,
    a = ar0.parse(R),
    e = new ur0(a);
  if (a.devtools) kr0(a);
  return Jt0(e, a);
}
function NP(T, R) {
  var a = {};
  for (var e in T) if (Object.prototype.hasOwnProperty.call(T, e) && R.indexOf(e) < 0) a[e] = T[e];
  if (T != null && typeof Object.getOwnPropertySymbols === "function") {
    for (var t = 0, e = Object.getOwnPropertySymbols(T); t < e.length; t++) if (R.indexOf(e[t]) < 0 && Object.prototype.propertyIsEnumerable.call(T, e[t])) a[e[t]] = T[e[t]];
  }
  return a;
}