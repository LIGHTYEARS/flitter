function r1() {
  L0 = null, hi = null, ia = null;
}
function WyT(T, R) {
  if (T < 24) _R[aR++] = R | T;else if (T < 256) _R[aR++] = R | 24, _R[aR++] = T;else if (T < 65536) _R[aR++] = R | 25, _R[aR++] = T >> 8, _R[aR++] = T & 255;else _R[aR++] = R | 26, b3.setUint32(aR, T), aR += 4;
}