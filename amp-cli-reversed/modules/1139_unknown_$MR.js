function IMR() {
  let T = 16,
    R = "";
  while (T--) R += "abcdefghijklmnopqrstuvwxyz0123456789"[Math.random() * 36 << 0];
  return R;
}
function $MR(T) {
  if (vMR(T) !== "object") return !1;
  let R = Object.getPrototypeOf(T);
  if (R === null || R === void 0) return !0;
  return (R.constructor && R.constructor.toString()) === Object.toString();
}