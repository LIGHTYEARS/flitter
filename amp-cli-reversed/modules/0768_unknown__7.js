function WvR(T, R) {
  let a = {},
    e = H(R, ["name"]);
  if (e != null) Y(a, ["_url", "name"], Cn(T, e));
  let t = H(R, ["config"]);
  if (t != null) UvR(t, a);
  return a;
}
function qvR(T, R) {
  let a = {},
    e = H(R, ["name"]);
  if (e != null) Y(a, ["_url", "name"], Cn(T, e));
  let t = H(R, ["config"]);
  if (t != null) HvR(t, a);
  return a;
}
function _7(T, R) {
  var a = {};
  for (var e in T) if (Object.prototype.hasOwnProperty.call(T, e) && R.indexOf(e) < 0) a[e] = T[e];
  if (T != null && typeof Object.getOwnPropertySymbols === "function") {
    for (var t = 0, e = Object.getOwnPropertySymbols(T); t < e.length; t++) if (R.indexOf(e[t]) < 0 && Object.prototype.propertyIsEnumerable.call(T, e[t])) a[e[t]] = T[e[t]];
  }
  return a;
}