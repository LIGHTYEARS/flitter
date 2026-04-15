function GSR(T, R) {
  let a = {},
    e = H(T, ["category"]);
  if (e != null) Y(a, ["category"], e);
  if (H(T, ["method"]) !== void 0) throw Error("method parameter is not supported in Gemini API.");
  let t = H(T, ["threshold"]);
  if (t != null) Y(a, ["threshold"], t);
  return a;
}