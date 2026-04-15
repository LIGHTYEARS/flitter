function uiT(T, R, a, e, t = 0) {
  if (T.length < 16) throw Error("Random bytes length must be >= 16");
  if (!e) e = new Uint8Array(16), t = 0;else if (t < 0 || t + 16 > e.length) throw RangeError(`UUID byte range ${t}:${t + 15} is out of buffer bounds`);
  return R ??= Date.now(), a ??= T[6] * 127 << 24 | T[7] << 16 | T[8] << 8 | T[9], e[t++] = R / 1099511627776 & 255, e[t++] = R / 4294967296 & 255, e[t++] = R / 16777216 & 255, e[t++] = R / 65536 & 255, e[t++] = R / 256 & 255, e[t++] = R & 255, e[t++] = 112 | a >>> 28 & 15, e[t++] = a >>> 20 & 255, e[t++] = 128 | a >>> 14 & 63, e[t++] = a >>> 6 & 255, e[t++] = a << 2 & 255 | T[10] & 3, e[t++] = T[11], e[t++] = T[12], e[t++] = T[13], e[t++] = T[14], e[t++] = T[15], e;
}