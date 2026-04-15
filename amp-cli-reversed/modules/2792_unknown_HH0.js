function HH0(T, R, a, e) {
  var t = null;
  for (var r = 0; r < a.length; r++) {
    var h = a[r];
    if (h.id === 28789) {
      if (h.data.length < 6) continue;
      if (h.data.readUInt8(0) !== 1) continue;
      var i = h.data.readUInt32LE(1);
      if (CH0.unsigned(R) !== i) continue;
      t = xB(h.data.subarray(5), !0);
      break;
    }
  }
  if (t == null) {
    var c = (T & 2048) !== 0;
    t = xB(R, c);
  }
  if (!e) t = t.replace(/\\/g, "/");
  return t;
}