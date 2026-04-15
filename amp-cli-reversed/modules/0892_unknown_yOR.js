function pOR(T, R) {
  let a = {},
    e = H(T, ["displayName"]);
  if (R !== void 0 && e != null) Y(R, ["displayName"], e);
  return a;
}
function _OR(T) {
  let R = {},
    a = H(T, ["config"]);
  if (a != null) pOR(a, R);
  return R;
}
function bOR(T, R) {
  let a = {},
    e = H(T, ["force"]);
  if (R !== void 0 && e != null) Y(R, ["_query", "force"], e);
  return a;
}
function mOR(T) {
  let R = {},
    a = H(T, ["name"]);
  if (a != null) Y(R, ["_url", "name"], a);
  let e = H(T, ["config"]);
  if (e != null) bOR(e, R);
  return R;
}
function uOR(T) {
  let R = {},
    a = H(T, ["name"]);
  if (a != null) Y(R, ["_url", "name"], a);
  return R;
}
function yOR(T, R) {
  let a = {},
    e = H(T, ["customMetadata"]);
  if (R !== void 0 && e != null) {
    let r = e;
    if (Array.isArray(r)) r = r.map(h => {
      return h;
    });
    Y(R, ["customMetadata"], r);
  }
  let t = H(T, ["chunkingConfig"]);
  if (R !== void 0 && t != null) Y(R, ["chunkingConfig"], t);
  return a;
}