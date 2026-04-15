function sU(T, R) {
  let a = Ur(R),
    e = Object.values(n8).find(t => t.provider === P9.VERTEXAI && t.name === T);
  if (e === void 0) return a.warn(`Unknown gemini model ${T}`), {
    ...n8.GEMINI_3_1_PRO_PREVIEW,
    name: T,
    displayName: T
  };
  return e;
}