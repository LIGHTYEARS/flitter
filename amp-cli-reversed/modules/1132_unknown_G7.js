function qbT(T) {
  return TypeError(`ByteLengthQueuingStrategy.prototype.${T} can only be used on a ByteLengthQueuingStrategy`);
}
function zbT(T) {
  return !!At(T) && !!Object.prototype.hasOwnProperty.call(T, "_byteLengthQueuingStrategyHighWaterMark") && T instanceof F7;
}
class G7 {
  constructor(T) {
    mn(T, 1, "CountQueuingStrategy"), T = PHT(T, "First parameter"), this._countQueuingStrategyHighWaterMark = T.highWaterMark;
  }
  get highWaterMark() {
    if (!GbT(this)) throw FbT("highWaterMark");
    return this._countQueuingStrategyHighWaterMark;
  }
  get size() {
    if (!GbT(this)) throw FbT("size");
    return CHT;
  }
}