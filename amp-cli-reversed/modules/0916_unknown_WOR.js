function HOR(T, R) {
  let a = {},
    e = H(R, ["config"]);
  if (e != null) Y(a, ["config"], UOR(T, e, a));
  return a;
}
function WOR(T) {
  let R = {};
  if (H(T, ["displayName"]) !== void 0) throw Error("displayName parameter is not supported in Gemini API.");
  let a = H(T, ["fileUri"]);
  if (a != null) Y(R, ["fileUri"], a);
  let e = H(T, ["mimeType"]);
  if (e != null) Y(R, ["mimeType"], e);
  return R;
}