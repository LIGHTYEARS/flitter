function PSR(T, R) {
  let a = {},
    e = H(T, ["_self"]);
  if (e != null) Y(a, ["image"], dSR(e));
  let t = H(T, ["raiFilteredReason"]);
  if (t != null) Y(a, ["raiFilteredReason"], t);
  let r = H(T, ["_self"]);
  if (r != null) Y(a, ["safetyAttributes"], s6T(r));
  return a;
}