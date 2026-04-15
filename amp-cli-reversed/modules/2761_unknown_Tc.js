function T2(T, R, a) {
  return new xT({
    text: new G(`${T}${R}`, new cT({
      color: a
    })),
    maxLines: 1
  });
}
function jU0(T, R, a, e) {
  return [T2("+", T, e.success), y3.horizontal(1), T2("~", R, e.warning), y3.horizontal(1), T2("-", a, e.destructive)];
}
function SU0(T) {
  return typeof T === "object" && T !== null && "then" in T && typeof T.then === "function";
}
class Tc {
  message;
  constructor(T) {
    this.message = T;
  }
}