function Um(T, R) {
  if (Hr) ze(un(R));
  if (T.offset + R > T.bytes.length) throw new I0(T.offset, "missing bytes");
}
function Hm(T, R) {
  if (Hr) ze(un(R));
  let a = T.offset + R | 0;
  if (a > T.bytes.length) lYR(T, a);
}
function lYR(T, R) {
  if (R > T.config.maxBufferLength) throw new I0(0, jFT);
  let a = T.bytes.buffer,
    e;
  if (AYR(a) && T.bytes.byteOffset + T.bytes.byteLength === a.byteLength && T.bytes.byteLength + R <= a.maxByteLength) {
    let t = Math.min(R << 1, T.config.maxBufferLength, a.maxByteLength);
    if (a instanceof ArrayBuffer) a.resize(t);else a.grow(t);
    e = new Uint8Array(a, T.bytes.byteOffset, t);
  } else {
    let t = Math.min(R << 1, T.config.maxBufferLength);
    e = new Uint8Array(t), e.set(T.bytes);
  }
  T.bytes = e, T.view = new DataView(e.buffer);
}