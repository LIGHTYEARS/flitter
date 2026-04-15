function yYR(T, R) {
  let {
      bytes: a,
      offset: e
    } = T,
    t = 0;
  while (t < R.length) {
    let r = R.codePointAt(t++);
    if (r < 128) a[e++] = r;else {
      if (r < 2048) a[e++] = 192 | r >> 6;else {
        if (r < 65536) a[e++] = 224 | r >> 12;else a[e++] = 240 | r >> 18, a[e++] = 128 | r >> 12 & 63, t++;
        a[e++] = 128 | r >> 6 & 63;
      }
      a[e++] = 128 | r & 63;
    }
  }
  T.offset = e;
}