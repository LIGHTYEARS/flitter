function s6T(T, R) {
  let a = {},
    e = H(T, ["safetyAttributes", "categories"]);
  if (e != null) Y(a, ["categories"], e);
  let t = H(T, ["safetyAttributes", "scores"]);
  if (t != null) Y(a, ["scores"], t);
  let r = H(T, ["contentType"]);
  if (r != null) Y(a, ["contentType"], r);
  return a;
}