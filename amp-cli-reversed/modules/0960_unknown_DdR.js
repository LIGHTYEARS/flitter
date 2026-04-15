function DdR(T, R, a) {
  let e = {},
    t = H(T, ["pageSize"]);
  if (R !== void 0 && t != null) Y(R, ["_query", "pageSize"], t);
  let r = H(T, ["pageToken"]);
  if (R !== void 0 && r != null) Y(R, ["_query", "pageToken"], r);
  let h = H(T, ["filter"]);
  if (R !== void 0 && h != null) Y(R, ["_query", "filter"], h);
  return e;
}