function ESR(T, R, a, e) {
  let t = {},
    r = H(R, ["pageSize"]);
  if (a !== void 0 && r != null) Y(a, ["_query", "pageSize"], r);
  let h = H(R, ["pageToken"]);
  if (a !== void 0 && h != null) Y(a, ["_query", "pageToken"], h);
  let i = H(R, ["filter"]);
  if (a !== void 0 && i != null) Y(a, ["_query", "filter"], i);
  let c = H(R, ["queryBase"]);
  if (a !== void 0 && c != null) Y(a, ["_url", "models_url"], JBT(T, c));
  return t;
}