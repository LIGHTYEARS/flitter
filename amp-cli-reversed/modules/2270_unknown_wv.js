function wg0(T, R) {
  return QtT.parse(T, R);
}
function Bg0(T, R, a) {
  if (typeof T === "string") a = R, R = T, T = null;
  let e = QtT.getFragmentParser(T, a);
  return e.tokenizer.write(R, !0), e.getFragment();
}
function wv(T) {
  if (!T || typeof T !== "object") return "";
  if ("position" in T || "type" in T) return SfT(T.position);
  if ("start" in T || "end" in T) return SfT(T);
  if ("line" in T || "column" in T) return GY(T);
  return "";
}