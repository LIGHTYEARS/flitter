function aYR() {
  if (!QX) RYR();
  return QX;
}
function Vx(T = "default") {
  let R = JX.get(T);
  if (R) return R;
  let a = aYR(),
    e = TYR() ? a.child({
      target: T
    }) : a;
  return JX.set(T, e), e;
}
function myT() {
  return Vx("utils");
}
function eYR() {
  if (Pz !== void 0) return Pz;
  let T = `RivetKit/${GU}`,
    R = typeof navigator < "u" ? navigator : void 0;
  if (R == null ? void 0 : R.userAgent) T += ` ${R.userAgent}`;
  return Pz = T, T;
}