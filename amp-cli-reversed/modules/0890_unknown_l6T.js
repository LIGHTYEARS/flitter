function nOR(T, R) {
  let a = {},
    e = H(T, ["image"]);
  if (e != null) Y(a, ["_self"], Cc(e));
  let t = H(T, ["maskMode"]);
  if (t != null) Y(a, ["maskMode"], t);
  return a;
}
function lOR(T, R) {
  let a = {},
    e = H(T, ["image"]);
  if (e != null) Y(a, ["image"], cU(e));
  let t = H(T, ["referenceType"]);
  if (t != null) Y(a, ["referenceType"], t);
  return a;
}
function AOR(T, R) {
  let a = {},
    e = H(T, ["image"]);
  if (e != null) Y(a, ["image"], Cc(e));
  let t = H(T, ["referenceType"]);
  if (t != null) Y(a, ["referenceType"], t);
  return a;
}
function l6T(T, R) {
  let a = {},
    e = H(T, ["uri"]);
  if (e != null) Y(a, ["uri"], e);
  let t = H(T, ["videoBytes"]);
  if (t != null) Y(a, ["encodedVideo"], hp(t));
  let r = H(T, ["mimeType"]);
  if (r != null) Y(a, ["encoding"], r);
  return a;
}