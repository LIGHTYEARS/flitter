function pCR(T, R) {
  if (!T || !("tools" in T) || !T.tools) return !1;
  let a = T.tools?.find(e => P7(e) && e.function?.name === R.function.name);
  return P7(a) && (jO(a) || a?.function.strict || !1);
}