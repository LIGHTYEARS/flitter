function TSR(T, R) {
  let a = {},
    e = H(T, ["allowedFunctionNames"]);
  if (e != null) Y(a, ["allowedFunctionNames"], e);
  let t = H(T, ["mode"]);
  if (t != null) Y(a, ["mode"], t);
  if (H(T, ["streamFunctionCallArguments"]) !== void 0) throw Error("streamFunctionCallArguments parameter is not supported in Gemini API.");
  return a;
}