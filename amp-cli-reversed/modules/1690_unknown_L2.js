function zpR(T, R) {
  if (typeof R === "string") return L2(T, R);
  if (Array.isArray(R)) return R.some(a => typeof a === "string" && L2(T, a));
  return !1;
}
function L2(T, R) {
  if (R.length >= 3 && R.startsWith("/") && R.endsWith("/")) try {
    let e = R.slice(1, -1);
    return new RegExp(e, "m").test(T);
  } catch (e) {
    throw Error(`Invalid regex pattern: ${R}`);
  }
  if (R === "*") return !0;
  if (!R.includes("*")) return T === R;
  let a = R.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${a}$`, "m").test(T);
}