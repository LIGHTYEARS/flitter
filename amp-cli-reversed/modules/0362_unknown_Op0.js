function Sp0(T) {
  return T.type === "text";
}
function Op0(T) {
  if (T === void 0) return;
  let R;
  try {
    R = mH(T, "snapshot");
  } catch {
    return;
  }
  if (R.type === "snapshot") return dM(R.value);
  let a = (R.blocks ?? []).filter(Sp0).map(e => e.text).join("");
  return a.length > 0 ? a : void 0;
}