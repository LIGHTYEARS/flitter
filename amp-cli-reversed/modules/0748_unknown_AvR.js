function AvR(T) {
  let R = {},
    a = H(T, ["data"]);
  if (a != null) Y(R, ["data"], a);
  if (H(T, ["displayName"]) !== void 0) throw Error("displayName parameter is not supported in Gemini API.");
  let e = H(T, ["mimeType"]);
  if (e != null) Y(R, ["mimeType"], e);
  return R;
}