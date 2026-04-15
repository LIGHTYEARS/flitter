function eL(T) {
  if (T >= 1000) return `${(T / 1000).toFixed(1)}k`;
  return T.toString();
}
function xgT(T) {
  if (T >= 1048576) return `${(T / 1048576).toFixed(1)} MB`;
  if (T >= 1024) return `${Math.round(T / 1024)} KB`;
  return `${T} bytes`;
}
function DH0(T, R, a) {
  if (typeof R === "function") a = R, R = null;
  if (R == null) R = {};
  if (R.autoClose == null) R.autoClose = !0;
  if (R.lazyEntries == null) R.lazyEntries = !1;
  if (R.decodeStrings == null) R.decodeStrings = !0;
  if (R.validateEntrySizes == null) R.validateEntrySizes = !0;
  if (R.strictFileNames == null) R.strictFileNames = !1;
  if (a == null) a = fB;
  NQ.open(T, "r", function (e, t) {
    if (e) return a(e);
    wH0(t, R, function (r, h) {
      if (r) NQ.close(t, fB);
      a(r, h);
    });
  });
}