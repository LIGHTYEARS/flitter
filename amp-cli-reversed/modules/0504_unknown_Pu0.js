function Pu0(T) {
  let R = T.codePointAt(0);
  if (R === void 0) return "\uFFFD";
  if (R >= 0 && R <= 31) return String.fromCodePoint(9216 + R);
  if (R === 127) return "\u2421";
  return "\uFFFD";
}