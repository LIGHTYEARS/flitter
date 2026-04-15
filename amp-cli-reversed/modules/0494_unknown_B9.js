function J8(T, R = !0) {
  let a = kxT.get(T);
  if (a !== void 0) return a;
  let e = Nm0(T, R);
  return kxT.set(T, e), e;
}
function B9(T) {
  try {
    if (!mF) mF = new Intl.Segmenter("en", {
      granularity: "grapheme"
    });
    return Array.from(mF.segment(T), R => R.segment);
  } catch (R) {
    return Array.from(T);
  }
}