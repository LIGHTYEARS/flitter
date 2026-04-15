function pu0(T = {}) {
  let R = 5;
  if (T.reportEventTypes) R |= 2;
  if (T.reportAllKeys) R |= 8;
  if (T.reportAssociatedText) R |= 16;
  return t9 + `>${R}u`;
}
function yu0(T) {
  if (T === "\t") return !1;
  let R = T.codePointAt(0);
  if (R === void 0) return !1;
  if (R >= 0 && R <= 8 || R >= 10 && R <= 31 || R === 127) return !0;
  if (R >= 128 && R <= 159) return !0;
  if (R === 8232 || R === 8233) return !0;
  if (R === 65279) return !0;
  return !1;
}