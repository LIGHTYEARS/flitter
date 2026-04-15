function VdR(T) {
  return XdR(Z_(T));
}
function XdR(T) {
  if (T === void 0) return !1;
  return T.toLowerCase() === "true";
}
function YdR() {
  let T = Z_("GOOGLE_API_KEY"),
    R = Z_("GEMINI_API_KEY");
  if (T && R) console.warn("Both GOOGLE_API_KEY and GEMINI_API_KEY are set. Using GOOGLE_API_KEY.");
  return T || R || void 0;
}