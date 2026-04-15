function Fb(T) {
  let R;
  if (T < 16) {
    if (R = I2T(T)) return R;
  }
  if (T > 64 && R1) return R1.decode(L0.subarray(CR, CR += T));
  let a = CR + T,
    e = [];
  R = "";
  while (CR < a) {
    let t = L0[CR++];
    if ((t & 128) === 0) e.push(t);else if ((t & 224) === 192) {
      let r = L0[CR++] & 63,
        h = (t & 31) << 6 | r;
      if (h < 128) e.push(65533);else e.push(h);
    } else if ((t & 240) === 224) {
      let r = L0[CR++] & 63,
        h = L0[CR++] & 63,
        i = (t & 31) << 12 | r << 6 | h;
      if (i < 2048 || i >= 55296 && i <= 57343) e.push(65533);else e.push(i);
    } else if ((t & 248) === 240) {
      let r = L0[CR++] & 63,
        h = L0[CR++] & 63,
        i = L0[CR++] & 63,
        c = (t & 7) << 18 | r << 12 | h << 6 | i;
      if (c < 65536 || c > 1114111) e.push(65533);else if (c > 65535) c -= 65536, e.push(c >>> 10 & 1023 | 55296), c = 56320 | c & 1023, e.push(c);else e.push(c);
    } else e.push(65533);
    if (e.length >= 4096) R += le.apply(String, e), e.length = 0;
  }
  if (e.length > 0) R += le.apply(String, e);
  return R;
}