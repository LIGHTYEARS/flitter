function evR(T, R) {
  let a = {},
    e = H(T, ["pageSize"]);
  if (R !== void 0 && e != null) Y(R, ["_query", "pageSize"], e);
  let t = H(T, ["pageToken"]);
  if (R !== void 0 && t != null) Y(R, ["_query", "pageToken"], t);
  if (H(T, ["filter"]) !== void 0) throw Error("filter parameter is not supported in Gemini API.");
  return a;
}