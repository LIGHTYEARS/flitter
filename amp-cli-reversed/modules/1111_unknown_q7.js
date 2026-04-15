function tP(T) {
  return !!At(T) && !!Object.prototype.hasOwnProperty.call(T, "_readIntoRequests") && T instanceof Dl;
}
function sHT(T, R) {
  let a = T._readIntoRequests;
  T._readIntoRequests = new Dh(), a.forEach(e => {
    e._errorSteps(R);
  });
}
function DC(T) {
  return TypeError(`ReadableStreamBYOBReader.prototype.${T} can only be used on a ReadableStreamBYOBReader`);
}
function Yj(T, R) {
  let {
    highWaterMark: a
  } = T;
  if (a === void 0) return R;
  if (z3T(a) || a < 0) throw RangeError("Invalid highWaterMark");
  return a;
}
function W7(T) {
  let {
    size: R
  } = T;
  return R || (() => 1);
}
function q7(T, R) {
  hn(T, R);
  let a = T == null ? void 0 : T.highWaterMark,
    e = T == null ? void 0 : T.size;
  return {
    highWaterMark: a === void 0 ? void 0 : d3T(a),
    size: e === void 0 ? void 0 : FLR(e, `${R} has member 'size' that`)
  };
}