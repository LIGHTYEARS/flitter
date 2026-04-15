function yfR(T, R, a) {
  if (R = PfR(R), R in T) Object.defineProperty(T, R, {
    value: a,
    enumerable: !0,
    configurable: !0,
    writable: !0
  });else T[R] = a;
  return T;
}
function PfR(T) {
  var R = kfR(T, "string");
  return typeof R === "symbol" ? R : String(R);
}
function kfR(T, R) {
  if (typeof T !== "object" || T === null) return T;
  var a = T[Symbol.toPrimitive];
  if (a !== void 0) {
    var e = a.call(T, R || "default");
    if (typeof e !== "object") return e;
    throw TypeError("@@toPrimitive must return a primitive value.");
  }
  return (R === "string" ? String : Number)(T);
}