function ln(T) {
  let R = X2.get(T);
  if (R) return R;
  let a = lbR(T);
  return X2.set(T, a), a;
}
function X9(T) {
  return Boolean(typeof T === "object" && "user" in T && T.user);
}
function oA(T) {
  return typeof T === "object" && "error" in T;
}
function tq(T, R, a) {
  if (T.startsWith("mcp__")) return R.allowMcp ?? !1;
  if (T.startsWith("tb__")) {
    if (!(R.allowToolbox ?? !1)) return !1;
    let e = "subagentType" in R ? R.subagentType : void 0;
    if (e && a) {
      if (!a.subagentTypes) return !1;
      return a.subagentTypes.includes("all") || a.subagentTypes.includes(e);
    }
    return !0;
  }
  return R.includeTools.includes(T);
}