function QjR(T, R) {
  let a = {},
    e = H(T, ["endpoint"]);
  if (e != null) Y(a, ["name"], e);
  let t = H(T, ["deployedModelId"]);
  if (t != null) Y(a, ["deployedModelId"], t);
  return a;
}
function ZjR(T, R) {
  let a = {};
  if (H(T, ["displayName"]) !== void 0) throw Error("displayName parameter is not supported in Gemini API.");
  let e = H(T, ["fileUri"]);
  if (e != null) Y(a, ["fileUri"], e);
  let t = H(T, ["mimeType"]);
  if (t != null) Y(a, ["mimeType"], t);
  return a;
}