function bvR(T, R) {
  let a = {},
    e = H(R, ["model"]);
  if (e != null) Y(a, ["model"], FBT(T, e));
  let t = H(R, ["config"]);
  if (t != null) pvR(t, a);
  return a;
}
function mvR(T, R) {
  let a = {},
    e = H(R, ["model"]);
  if (e != null) Y(a, ["model"], FBT(T, e));
  let t = H(R, ["config"]);
  if (t != null) _vR(t, a);
  return a;
}
function uvR(T, R) {
  let a = {},
    e = H(R, ["name"]);
  if (e != null) Y(a, ["_url", "name"], Cn(T, e));
  return a;
}
function yvR(T, R) {
  let a = {},
    e = H(R, ["name"]);
  if (e != null) Y(a, ["_url", "name"], Cn(T, e));
  return a;
}
function PvR(T) {
  let R = {},
    a = H(T, ["sdkHttpResponse"]);
  if (a != null) Y(R, ["sdkHttpResponse"], a);
  return R;
}
function kvR(T) {
  let R = {},
    a = H(T, ["sdkHttpResponse"]);
  if (a != null) Y(R, ["sdkHttpResponse"], a);
  return R;
}
function xvR(T) {
  let R = {};
  if (H(T, ["displayName"]) !== void 0) throw Error("displayName parameter is not supported in Gemini API.");
  let a = H(T, ["fileUri"]);
  if (a != null) Y(R, ["fileUri"], a);
  let e = H(T, ["mimeType"]);
  if (e != null) Y(R, ["mimeType"], e);
  return R;
}