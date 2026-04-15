function HYT(T, R, a) {
  if (R$0(T)) {
    if ("value" in T) return T.type === "html" && !a ? "" : T.value;
    if (R && "alt" in T && T.alt) return T.alt;
    if ("children" in T) return CfT(T.children, R, a);
  }
  if (Array.isArray(T)) return CfT(T, R, a);
  return "";
}