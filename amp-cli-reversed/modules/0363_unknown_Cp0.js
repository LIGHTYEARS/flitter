function Ep0(T) {
  return typeof T === "string" && dp0.includes(T);
}
function Cp0(T) {
  if (T === void 0) return;
  let R;
  try {
    R = mH(T, "snapshot");
  } catch {
    return;
  }
  if (R.type !== "snapshot") return;
  let a = R.value;
  if (!Sw(a)) return;
  if (!("status" in a) || !Ep0(a.status)) return;
  return a.status;
}