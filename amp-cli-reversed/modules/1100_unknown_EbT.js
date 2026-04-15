function EbT(T) {
  if (!At(T)) return !1;
  if (!Object.prototype.hasOwnProperty.call(T, "_asyncIteratorImpl")) return !1;
  try {
    return T._asyncIteratorImpl instanceof E3T;
  } catch (R) {
    return !1;
  }
}