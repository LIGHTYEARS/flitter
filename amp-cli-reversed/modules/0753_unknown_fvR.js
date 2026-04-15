function fvR(T) {
  let R = {},
    a = H(T, ["id"]);
  if (a != null) Y(R, ["id"], a);
  let e = H(T, ["args"]);
  if (e != null) Y(R, ["args"], e);
  let t = H(T, ["name"]);
  if (t != null) Y(R, ["name"], t);
  if (H(T, ["partialArgs"]) !== void 0) throw Error("partialArgs parameter is not supported in Gemini API.");
  if (H(T, ["willContinue"]) !== void 0) throw Error("willContinue parameter is not supported in Gemini API.");
  return R;
}