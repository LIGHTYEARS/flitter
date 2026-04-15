function JOR(T, R) {
  let a = {},
    e = H(T, ["force"]);
  if (R !== void 0 && e != null) Y(R, ["_query", "force"], e);
  return a;
}
function TdR(T) {
  let R = {},
    a = H(T, ["name"]);
  if (a != null) Y(R, ["_url", "name"], a);
  let e = H(T, ["config"]);
  if (e != null) JOR(e, R);
  return R;
}
function RdR(T) {
  let R = {},
    a = H(T, ["name"]);
  if (a != null) Y(R, ["_url", "name"], a);
  return R;
}
function adR(T, R) {
  let a = {},
    e = H(T, ["pageSize"]);
  if (R !== void 0 && e != null) Y(R, ["_query", "pageSize"], e);
  let t = H(T, ["pageToken"]);
  if (R !== void 0 && t != null) Y(R, ["_query", "pageToken"], t);
  return a;
}