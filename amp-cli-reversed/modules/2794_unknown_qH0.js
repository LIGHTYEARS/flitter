function qH0(T) {
  var R = [],
    a = 0;
  while (a < T.length - 3) {
    var e = T.readUInt16LE(a + 0),
      t = T.readUInt16LE(a + 2),
      r = a + 4,
      h = r + t;
    if (h > T.length) throw Error("extra field length exceeds extra field buffer size");
    var i = T.subarray(r, h);
    R.push({
      id: e,
      data: i
    }), a = h;
  }
  return R;
}