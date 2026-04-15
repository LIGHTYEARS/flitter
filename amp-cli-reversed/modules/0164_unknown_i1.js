function i1(T, R) {
  let a = T.byteLength;
  if (a < 24) _R[aR++] = 64 + a;else if (a < 256) _R[aR++] = 88, _R[aR++] = a;else if (a < 65536) _R[aR++] = 89, _R[aR++] = a >> 8, _R[aR++] = a & 255;else _R[aR++] = 90, b3.setUint32(aR, a), aR += 4;
  if (aR + a >= _R.length) R(aR + a);
  _R.set(T.buffer ? T : new Uint8Array(T), aR), aR += a;
}