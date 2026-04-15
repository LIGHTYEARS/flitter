function TlR(T, R, a) {
  if (T.msecs ??= -1 / 0, T.seq ??= 0, R > T.msecs) T.seq = a[6] << 23 | a[7] << 16 | a[8] << 8 | a[9], T.msecs = R;else if (T.seq = T.seq + 1 | 0, T.seq === 0) T.msecs++;
  return T;
}