function GKR(T) {
  let R = "",
    a = 0;
  while (a < T.length) {
    let e = T[a++];
    if (e < 128) R += String.fromCharCode(e);else if (e < 224) {
      let t = T[a++] & 63;
      R += String.fromCharCode((e & 31) << 6 | t);
    } else if (e < 240) {
      let t = T[a++] & 63,
        r = T[a++] & 63;
      R += String.fromCharCode((e & 15) << 12 | t << 6 | r);
    } else {
      let t = T[a++] & 63,
        r = T[a++] & 63,
        h = T[a++] & 63,
        i = (e & 7) << 18 | t << 12 | r << 6 | h;
      i -= 65536, R += String.fromCharCode(55296 + (i >> 10 & 1023), 56320 + (i & 1023));
    }
  }
  return R;
}