function FR0(T) {
  return typeof T === "object" && T !== null && "then" in T && typeof T.then === "function";
}
function k2T(T, R, a) {
  let e = zR0(T == null ? void 0 : T[R]);
  if (!e) return {
    success: !0,
    data: a
  };
  if (WR0(e)) {
    let t = e["~standard"].validate(a);
    if (FR0(t)) throw new v1R("async schema validation");
    if (t.issues) return {
      success: !1,
      issues: [...t.issues]
    };
    return {
      success: !0,
      data: t.value
    };
  }
  return {
    success: !0,
    data: a
  };
}