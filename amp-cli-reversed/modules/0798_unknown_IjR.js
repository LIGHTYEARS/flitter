function fjR(T) {
  let R = {},
    a = H(T, ["type"]);
  if (a != null) Y(R, ["voiceActivityType"], a);
  return R;
}
function IjR(T, R) {
  let a = {},
    e = H(T, ["data"]);
  if (e != null) Y(a, ["data"], e);
  if (H(T, ["displayName"]) !== void 0) throw Error("displayName parameter is not supported in Gemini API.");
  let t = H(T, ["mimeType"]);
  if (t != null) Y(a, ["mimeType"], t);
  return a;
}