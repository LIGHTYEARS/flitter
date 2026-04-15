function yHT(T, R) {
  T._state = "errored", T._storedError = R;
  let a = T._reader;
  a !== void 0 && (O3T(a, R), J_(a) ? ZUT(a, R) : sHT(a, R));
}
function R_(T) {
  return TypeError(`ReadableStream.prototype.${T} can only be used on a ReadableStream`);
}
function PHT(T, R) {
  hn(T, R);
  let a = T == null ? void 0 : T.highWaterMark;
  return ZV(a, "highWaterMark", "QueuingStrategyInit"), {
    highWaterMark: d3T(a)
  };
}
class F7 {
  constructor(T) {
    mn(T, 1, "ByteLengthQueuingStrategy"), T = PHT(T, "First parameter"), this._byteLengthQueuingStrategyHighWaterMark = T.highWaterMark;
  }
  get highWaterMark() {
    if (!zbT(this)) throw qbT("highWaterMark");
    return this._byteLengthQueuingStrategyHighWaterMark;
  }
  get size() {
    if (!zbT(this)) throw qbT("size");
    return EHT;
  }
}