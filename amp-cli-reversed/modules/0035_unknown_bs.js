function KKR(T) {
  let R = "";
  for (let a = 0; a < T.length; a += 2) R += String.fromCharCode(T[a] | T[a + 1] << 8);
  return R;
}
function VKR(T) {
  return String.fromCharCode(...T.map(R => R & 127));
}
function XKR(T) {
  return String.fromCharCode(...T);
}
function YKR(T) {
  let R = "";
  for (let a of T) if (a >= 128 && a <= 159 && FX[a]) R += FX[a];else R += String.fromCharCode(a);
  return R;
}
function Dr(T) {
  return new DataView(T.buffer, T.byteOffset);
}
class bs {
  constructor(T, R) {
    this.len = T, this.encoding = R;
  }
  get(T, R = 0) {
    let a = T.subarray(R, R + this.len);
    return FKR(a, this.encoding);
  }
}