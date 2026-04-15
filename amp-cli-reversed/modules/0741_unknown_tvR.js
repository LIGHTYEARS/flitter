function tvR(T, R) {
  let a = {},
    e = H(T, ["pageSize"]);
  if (R !== void 0 && e != null) Y(R, ["_query", "pageSize"], e);
  let t = H(T, ["pageToken"]);
  if (R !== void 0 && t != null) Y(R, ["_query", "pageToken"], t);
  let r = H(T, ["filter"]);
  if (R !== void 0 && r != null) Y(R, ["_query", "filter"], r);
  return a;
}