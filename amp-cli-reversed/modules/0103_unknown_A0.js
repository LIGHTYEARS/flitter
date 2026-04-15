function ze(T, R = "") {
  if (!T) {
    let a = new $FT(R);
    throw tYR.captureStackTrace?.(a, ze), a;
  }
}
function rYR(T) {
  return T === BigInt.asIntN(64, T);
}
function hYR(T) {
  return T === (T & 255);
}
function iYR(T) {
  return T === (T & 65535);
}
function un(T) {
  return T === T >>> 0;
}
function cYR(T) {
  return T === BigInt.asUintN(64, T);
}
function sYR(T) {
  return Number.isSafeInteger(T) && T >= 0;
}
class A0 {
  constructor(T, R) {
    if (this.offset = 0, T.length > R.maxBufferLength) throw new I0(0, jFT);
    this.bytes = T, this.config = R, this.view = new DataView(T.buffer, T.byteOffset, T.length);
  }
}