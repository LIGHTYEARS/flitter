function iPR(T, R) {
  if (R) return `stdio://${R}`;
  return `stdio://${T.split(/[/\\]/).pop() || "unknown"}`;
}
function plT(T) {
  if (T instanceof _h || T?.name === "UnauthorizedError" || T instanceof JCT) return !0;
  if (T instanceof Error) {
    let R = T.message.toLowerCase(),
      a = R.includes("http 403") || R.includes("403 forbidden"),
      e = R.includes("forbidden"),
      t = R.includes("insufficient_scope");
    if ((a || e) && !t) return !0;
  }
  return !1;
}