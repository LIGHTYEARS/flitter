function PF(T, R, a) {
  return T + (R - T) * a;
}
function pXT(T, R, a) {
  let e = Math.max(0, Math.min(1, a));
  return {
    r: Math.round(PF(T.r, R.r, e)),
    g: Math.round(PF(T.g, R.g, e)),
    b: Math.round(PF(T.b, R.b, e))
  };
}
function _XT(T) {
  let R = xi(T ?? "smart") ?? xi("smart");
  if (R?.uiHints?.primaryColor && R.uiHints.secondaryColor) return {
    primary: R.uiHints.primaryColor,
    secondary: R.uiHints.secondaryColor
  };
  return {
    primary: tCT,
    secondary: rCT
  };
}