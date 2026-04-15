function wH0(T, R, a) {
  if (typeof R === "function") a = R, R = null;
  if (R == null) R = {};
  if (R.autoClose == null) R.autoClose = !1;
  if (R.lazyEntries == null) R.lazyEntries = !1;
  if (R.decodeStrings == null) R.decodeStrings = !0;
  if (R.validateEntrySizes == null) R.validateEntrySizes = !0;
  if (R.strictFileNames == null) R.strictFileNames = !1;
  if (a == null) a = fB;
  NQ.fstat(T, function (e, t) {
    if (e) return a(e);
    var r = EH0.createFromFd(T, {
      autoClose: !0
    });
    BH0(r, t.size, R, a);
  });
}