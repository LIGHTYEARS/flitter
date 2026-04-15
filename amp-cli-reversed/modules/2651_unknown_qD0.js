function MD0() {
  if (!MJT()) return;
  if (iA) iA.stop(), iA = null;
}
function KZ0() {
  return iA?.getSocketPath() ?? null;
}
function BJT(T) {
  let R = T.dependOnInheritedWidgetOfExactType(aW);
  if (R) return R.widget.showCosts;
  return Uv;
}
function NJT(T) {
  let R = T.dependOnInheritedWidgetOfExactType(aW);
  if (R) return R.widget.showDetailedCosts;
  return Uv;
}
function rf(T) {
  let R = T.dependOnInheritedWidgetOfExactType(OrT);
  if (!R) return null;
  return R.widget.displayPathEnvInfo;
}
function ki(T, R) {
  if (T.startsWith("/") || /^[A-Za-z]:[\\/]/.test(T)) {
    let a = rf(R),
      e = zR.file(T);
    return Mr(e, a ?? void 0);
  }
  return T;
}
function qD0(T, R, a, e) {
  let t = {
    name: T,
    label: R,
    source: {
      type: "custom",
      path: e
    },
    background: a.isLight ? "light" : "dark",
    buildBaseTheme: () => Pp(a),
    buildAppTheme: (r, h) => new Xa({
      base: h,
      app: yp(h.colorScheme, a)
    })
  };
  drT.set(T, t);
}