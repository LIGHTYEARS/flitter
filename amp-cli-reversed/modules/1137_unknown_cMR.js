function VbT(T, R) {
  return hc(T._transformAlgorithm(R), void 0, a => {
    throw V7(T._controlledTransformStream, a), a;
  });
}
function WC(T) {
  return TypeError(`TransformStreamDefaultController.prototype.${T} can only be used on a TransformStreamDefaultController`);
}
function XbT(T) {
  return TypeError(`TransformStream.prototype.${T} can only be used on a TransformStream`);
}
function Y7(T) {
  return !T._readableCloseRequested && T._readableState === "readable";
}
function fHT(T) {
  T._readableState = "closed", T._readableCloseRequested = !0, T._readableController.close();
}
function Q7(T, R) {
  T._readableState === "readable" && (T._readableState = "errored", T._readableStoredError = R), T._readableController.error(R);
}
function IHT(T) {
  return T._readableController.desiredSize;
}
function G5(T, R) {
  T._writableState !== "writable" ? W3T(T) : gHT(T, R);
}
function gHT(T, R) {
  T._writableState = "erroring", T._writableStoredError = R, !function (a) {
    return a._writableHasInFlightOperation;
  }(T) && T._writableStarted && W3T(T);
}
function W3T(T) {
  T._writableState = "errored";
}
function YbT(T) {
  T._writableState === "erroring" && W3T(T);
}
async function* cMR(T) {
  let R = T.byteOffset + T.byteLength,
    a = T.byteOffset;
  while (a !== R) {
    let e = Math.min(R - a, LHT),
      t = T.buffer.slice(a, a + e);
    a += t.byteLength, yield new Uint8Array(t);
  }
}