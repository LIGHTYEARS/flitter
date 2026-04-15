function K$R(T) {
  let R = {},
    a = H(T, ["allowedFunctionNames"]);
  if (a != null) Y(R, ["allowedFunctionNames"], a);
  let e = H(T, ["mode"]);
  if (e != null) Y(R, ["mode"], e);
  if (H(T, ["streamFunctionCallArguments"]) !== void 0) throw Error("streamFunctionCallArguments parameter is not supported in Gemini API.");
  return R;
}