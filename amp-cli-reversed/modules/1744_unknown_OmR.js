function SmR(T) {
  try {
    return JSON.parse(T);
  } catch {
    return;
  }
}
function bq(T, R) {
  if (!T) return !1;
  if (typeof T === "string") return T === R;
  return T.includes(R);
}
function OmR(T, R, a) {
  if (!R || typeof T.args !== "object" || T.args === null) return T;
  let e = [],
    t = xL(T.args, R, "args", e);
  if (e.length > 0) J.info("[tool-service] Filtered extra arguments from tool call", {
    toolName: a,
    preFilterArgs: T.args,
    postFilterArgs: t,
    droppedPaths: e
  });
  return {
    ...T,
    args: t
  };
}