function gH(T, R) {
  if (T === R) return !0;
  if (T === void 0 || R === void 0) return !1;
  return T.uri === R.uri && T.id === R.id;
}
function uS(T) {
  if (T.type === "none") return;
  return T.alpha;
}
function PxT(T, R) {
  if (T === R) return !0;
  if (T === void 0 || R === void 0) return !1;
  if (T.type !== R.type) return !1;
  if (uS(T) !== uS(R)) return !1;
  switch (T.type) {
    case "none":
      return !0;
    case "default":
      return !0;
    case "index":
      return R.value === T.value;
    case "rgb":
      {
        let a = R.value;
        return a.r === T.value.r && a.g === T.value.g && a.b === T.value.b;
      }
    default:
      return !1;
  }
}