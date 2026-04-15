function JjR(T, R) {
  let a = {},
    e = H(T, ["id"]);
  if (e != null) Y(a, ["id"], e);
  let t = H(T, ["args"]);
  if (t != null) Y(a, ["args"], t);
  let r = H(T, ["name"]);
  if (r != null) Y(a, ["name"], r);
  if (H(T, ["partialArgs"]) !== void 0) throw Error("partialArgs parameter is not supported in Gemini API.");
  if (H(T, ["willContinue"]) !== void 0) throw Error("willContinue parameter is not supported in Gemini API.");
  return a;
}