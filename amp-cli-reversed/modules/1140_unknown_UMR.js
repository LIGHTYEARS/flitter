function UMR(T) {
  if (HMR(T) !== "object") return !1;
  let R = Object.getPrototypeOf(T);
  if (R === null || R === void 0) return !0;
  return (R.constructor && R.constructor.toString()) === Object.toString();
}