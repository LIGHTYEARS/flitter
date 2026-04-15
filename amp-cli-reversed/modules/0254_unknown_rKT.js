function _kT(T, R) {
  let a = [`Invalid ${T ? `visibility for amp.defaultVisibility.${T}` : "visibility"}. `, `Must be one of: ${R.join(", ")}.
`].join("");
  return Error(a);
}
function Oc0(T, R) {
  return R.includes(T);
}
function dc0(T) {
  return T?.team?.billingMode === "enterprise" || T?.team?.billingMode === "enterprise.selfserve";
}
function rKT(T, R, a) {
  if (T === void 0 || T === null) return;
  let e = jc0(R);
  if (typeof T !== "string") return _kT(a, e);
  if (T === "group" && !e.includes("group")) return Sc0(R);
  if (Oc0(T, e)) return T;
  return _kT(a, e);
}