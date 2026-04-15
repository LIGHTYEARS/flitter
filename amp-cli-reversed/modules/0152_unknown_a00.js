function R00(T) {
  return R8.copyBuffers ? Uint8Array.prototype.slice.call(L0, CR, CR += T) : L0.subarray(CR, CR += T);
}
function a00() {
  let T = L0[CR++],
    R = L0[CR++],
    a = (T & 127) >> 2;
  if (a === 31) {
    if (R || T & 3) return NaN;
    return T & 128 ? -1 / 0 : 1 / 0;
  }
  if (a === 0) {
    let e = ((T & 3) << 8 | R) / 16777216;
    return T & 128 ? -e : e;
  }
  return o4[3] = T & 128 | (a >> 1) + 56, o4[2] = (T & 7) << 5 | R >> 3, o4[1] = R << 5, o4[0] = 0, g2T[0];
}