function efT(T, R) {
  let a = T.split(`
`),
    e = a.map(t => `+${t}`).join(`
`);
  return `--- /dev/null
+++ b/${R}
@@ -0,0 +1,${a.length} @@
${e}`;
}
function tfT(T) {
  let R = T.lastIndexOf("/");
  return R === -1 ? T : T.slice(R + 1);
}
function M1T(T) {
  if (typeof T.cmd === "string") return T.cmd;
  if (typeof T.command === "string") return T.command;
  return;
}
function IF(T) {
  if (T.status === "in-progress" || T.status === "cancelled" || T.status === "error") {
    let R = LH(T.progress),
      a = R && typeof R === "object" && "output" in R ? R.output : R;
    return typeof a === "string" ? a : void 0;
  }
  if (T.status === "done" && typeof T.result === "object" && T.result && "output" in T.result) {
    let R = T.result,
      a = typeof R.output === "string" ? R.output : void 0;
    if (a && R.truncation?.prefixLinesOmitted) {
      let e = R.truncation.prefixLinesOmitted;
      a = `--- Truncated ${e} ${o9(e, "line")} above this point ---
` + a;
    }
    return a;
  }
  return;
}