function ps(T) {
  if (T < 24) _R[aR++] = 128 | T;else if (T < 256) _R[aR++] = 152, _R[aR++] = T;else if (T < 65536) _R[aR++] = 153, _R[aR++] = T >> 8, _R[aR++] = T & 255;else _R[aR++] = 154, b3.setUint32(aR, T), aR += 4;
}