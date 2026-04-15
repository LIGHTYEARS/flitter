function ovR(T) {
  let R = {},
    a = H(T, ["category"]);
  if (a != null) Y(R, ["category"], a);
  if (H(T, ["method"]) !== void 0) throw Error("method parameter is not supported in Gemini API.");
  let e = H(T, ["threshold"]);
  if (e != null) Y(R, ["threshold"], e);
  return R;
}