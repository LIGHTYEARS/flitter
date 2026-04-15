function zvR(T) {
  var R;
  if (T.candidates == null || T.candidates.length === 0) return !1;
  let a = (R = T.candidates[0]) === null || R === void 0 ? void 0 : R.content;
  if (a === void 0) return !1;
  return r6T(a);
}