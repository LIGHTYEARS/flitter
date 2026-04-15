function as(T, R) {
  if (!l00 && R > 1) T -= 4;
  return {
    tag: T,
    encode: function (a, e) {
      let t = a.byteLength,
        r = a.byteOffset || 0,
        h = a.buffer || a;
      e(GO ? QU.from(h, r, t) : new Uint8Array(h, r, t));
    }
  };
}