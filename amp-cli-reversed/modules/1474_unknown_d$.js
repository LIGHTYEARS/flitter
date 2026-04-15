function st(T) {
  if (T) Object.assign(Fv, T);
  return Fv;
}
function miR(T) {
  return T;
}
function uiR(T) {
  return T;
}
function yiR(T) {}
function PiR(T) {
  throw Error("Unexpected value in exhaustive check");
}
function kiR(T) {}
function GZ(T) {
  let R = Object.values(T).filter(a => typeof a === "number");
  return Object.entries(T).filter(([a, e]) => R.indexOf(+a) === -1).map(([a, e]) => e);
}
function ZR(T, R = "|") {
  return T.map(a => A9(a)).join(R);
}
function tD(T, R) {
  if (typeof R === "bigint") return R.toString();
  return R;
}
function d$(T) {
  return {
    get value() {
      {
        let R = T();
        return Object.defineProperty(this, "value", {
          value: R
        }), R;
      }
      throw Error("cached value already set");
    }
  };
}