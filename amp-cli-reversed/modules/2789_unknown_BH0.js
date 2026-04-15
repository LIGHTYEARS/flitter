function BH0(T, R, a, e) {
  if (typeof a === "function") e = a, a = null;
  if (a == null) a = {};
  if (a.autoClose == null) a.autoClose = !0;
  if (a.lazyEntries == null) a.lazyEntries = !1;
  if (a.decodeStrings == null) a.decodeStrings = !0;
  var t = !!a.decodeStrings;
  if (a.validateEntrySizes == null) a.validateEntrySizes = !0;
  if (a.strictFileNames == null) a.strictFileNames = !1;
  if (e == null) e = fB;
  if (typeof R !== "number") throw Error("expected totalSize parameter to be a number");
  if (R > Number.MAX_SAFE_INTEGER) throw Error("zip file too large. only file sizes up to 2^52 are supported due to JavaScript's Number type being an IEEE 754 double.");
  T.ref();
  var r = 22,
    h = 20,
    i = 65535,
    c = Math.min(h + r + i, R),
    s = In(c),
    A = R - s.length;
  tx(T, s, 0, c, A, function (l) {
    if (l) return e(l);
    for (var o = c - r; o >= 0; o -= 1) {
      if (s.readUInt32LE(o) !== 101010256) continue;
      var n = s.subarray(o),
        p = n.readUInt16LE(4),
        _ = n.readUInt16LE(10),
        m = n.readUInt32LE(16),
        b = n.readUInt16LE(20),
        y = n.length - r;
      if (b !== y) return e(Error("Invalid comment length. Expected: " + y + ". Found: " + b + ". Are there extra bytes at the end of the file? Or is the end of central dir signature `PK\u263A\u263B` in the comment?"));
      var u = t ? xB(n.subarray(22), !1) : n.subarray(22);
      if (o - h >= 0 && s.readUInt32LE(o - h) === 117853008) {
        var P = s.subarray(o - h, o - h + h),
          k = JP(P, 8),
          x = In(56);
        return tx(T, x, 0, x.length, k, function (f) {
          if (f) return e(f);
          if (x.readUInt32LE(0) !== 101075792) return e(Error("invalid zip64 end of central directory record signature"));
          if (p = x.readUInt32LE(16), p !== 0) return e(Error("multi-disk zip files are not supported: found disk number: " + p));
          return _ = JP(x, 32), m = JP(x, 48), e(null, new fn(T, m, R, _, u, a.autoClose, a.lazyEntries, t, a.validateEntrySizes, a.strictFileNames));
        });
      }
      if (p !== 0) return e(Error("multi-disk zip files are not supported: found disk number: " + p));
      return e(null, new fn(T, m, R, _, u, a.autoClose, a.lazyEntries, t, a.validateEntrySizes, a.strictFileNames));
    }
    e(Error("End of central directory record signature not found. Either not a zip file, or file is truncated."));
  });
}