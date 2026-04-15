function GvR(T) {
  let R = {},
    a = H(T, ["file"]);
  if (a != null) Y(R, ["file"], a);
  return R;
}
function KvR(T) {
  let R = {},
    a = H(T, ["sdkHttpResponse"]);
  if (a != null) Y(R, ["sdkHttpResponse"], a);
  return R;
}
function VvR(T) {
  let R = {},
    a = H(T, ["name"]);
  if (a != null) Y(R, ["_url", "file"], z8T(a));
  return R;
}
function XvR(T) {
  let R = {},
    a = H(T, ["sdkHttpResponse"]);
  if (a != null) Y(R, ["sdkHttpResponse"], a);
  return R;
}
function YvR(T) {
  let R = {},
    a = H(T, ["name"]);
  if (a != null) Y(R, ["_url", "file"], z8T(a));
  return R;
}
function QvR(T) {
  let R = {},
    a = H(T, ["uris"]);
  if (a != null) Y(R, ["uris"], a);
  return R;
}
function ZvR(T, R) {
  let a = {},
    e = H(T, ["pageSize"]);
  if (R !== void 0 && e != null) Y(R, ["_query", "pageSize"], e);
  let t = H(T, ["pageToken"]);
  if (R !== void 0 && t != null) Y(R, ["_query", "pageToken"], t);
  return a;
}